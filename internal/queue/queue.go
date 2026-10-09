package queue

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"spanel/internal/db"
	"gorm.io/gorm"
)

type JobHandler func(ctx context.Context, job *db.InternalQueueJob) error

type Queue struct {
	db       *gorm.DB
	handlers map[string]JobHandler
	notifyCh chan struct{}
	stopCh   chan struct{}
	wg       sync.WaitGroup
}

var GlobalQueue *Queue

func NewQueue(database *gorm.DB) *Queue {
	q := &Queue{
		db:       database,
		handlers: make(map[string]JobHandler),
		notifyCh: make(chan struct{}, 100),
		stopCh:   make(chan struct{}),
	}
	GlobalQueue = q
	return q
}

func (q *Queue) RegisterHandler(jobType string, handler JobHandler) {
	q.handlers[jobType] = handler
}

// Enqueue inserts a job into SQLite and notifies the worker
func (q *Queue) Enqueue(jobType string, targetID string) (*db.InternalQueueJob, error) {
	job := &db.InternalQueueJob{
		JobType:  jobType,
		TargetID: targetID,
		Status:   "pending",
	}

	if err := q.db.Create(job).Error; err != nil {
		return nil, fmt.Errorf("failed to enqueue job: %w", err)
	}

	select {
	case q.notifyCh <- struct{}{}:
	default:
	}

	return job, nil
}

// Start runs the worker loop in a goroutine
func (q *Queue) Start(ctx context.Context) {
	// Reset orphaned jobs on startup
	q.db.Exec(`UPDATE internal_queue_jobs SET status='pending' WHERE status='processing'`)

	workerCount := 3
	for i := 0; i < workerCount; i++ {
		q.wg.Add(1)
		go func(workerID int) {
			defer q.wg.Done()
			ticker := time.NewTicker(1 * time.Second)
			defer ticker.Stop()

			log.Printf("[QUEUE] Background worker %d started", workerID)

			for {
				select {
				case <-ctx.Done():
					log.Printf("[QUEUE] Background worker %d stopped by context", workerID)
					return
				case <-q.stopCh:
					log.Printf("[QUEUE] Background worker %d stopped", workerID)
					return
				case <-q.notifyCh:
					q.processNextJob(ctx)
				case <-ticker.C:
					q.processNextJob(ctx)
				}
			}
		}(i)
	}
}

func (q *Queue) Stop() {
	close(q.stopCh)
	q.wg.Wait()
}

func (q *Queue) processNextJob(ctx context.Context) {
	var job db.InternalQueueJob

	// Fetch 1 pending job atomically
	res := q.db.Raw(`UPDATE internal_queue_jobs SET status='processing', updated_at=CURRENT_TIMESTAMP
		WHERE id = (SELECT id FROM internal_queue_jobs WHERE status='pending' AND deleted_at IS NULL
					ORDER BY created_at LIMIT 1)
		RETURNING *`).Scan(&job)

	if res.Error != nil || job.ID == "" {
		return 
	}

	log.Printf("[QUEUE] Processing job ID: %s, Type: %s, Target: %s", job.ID, job.JobType, job.TargetID)

	handler, exists := q.handlers[job.JobType]
	if !exists {
		errMsg := fmt.Sprintf("no handler registered for job type: %s", job.JobType)
		log.Printf("[QUEUE ERROR] %s", errMsg)
	if err := q.db.Model(&job).Updates(map[string]interface{}{
		"status":      "failed",
		"error_trace": errMsg,
	}).Error; err != nil {
		log.Printf("[QUEUE ERROR] Failed to update job status: %v", err)
	}
	return
}

jobCtx, cancel := context.WithTimeout(ctx, 30*time.Minute)
defer cancel()

if err := handler(jobCtx, &job); err != nil {
	log.Printf("[QUEUE ERROR] Job %s failed: %v", job.ID, err)
	_ = q.db.Model(&job).Updates(map[string]interface{}{
		"status":      "failed",
		"error_trace": err.Error(),
	})
} else {
	log.Printf("[QUEUE SUCCESS] Job %s completed", job.ID)
	_ = q.db.Model(&job).Updates(map[string]interface{}{
		"status": "completed",
	})
}
}
