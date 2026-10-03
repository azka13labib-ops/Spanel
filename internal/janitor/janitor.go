package janitor

import (
	"context"
	"log"
	"os/exec"

	"github.com/robfig/cron/v3"
	"spanel/internal/db"
	"spanel/internal/queue"
)

type Janitor struct {
	cron  *cron.Cron
	queue *queue.Queue
}

func NewJanitor(q *queue.Queue) *Janitor {
	return &Janitor{
		cron:  cron.New(cron.WithSeconds()),
		queue: q,
	}
}

func (j *Janitor) Start() {
	// Register job handler in queue
	j.queue.RegisterHandler("janitor_prune", func(ctx context.Context, job *db.InternalQueueJob) error {
		return RunDockerPrune()
	})

	// Run every day at 03:00:00 AM (cron spec with seconds: 0 0 3 * * *)
	_, err := j.cron.AddFunc("0 0 3 * * *", func() {
		log.Println("[JANITOR] Scheduled 3 AM prune triggered, enqueuing job...")
		_, _ = j.queue.Enqueue("janitor_prune", "system")
	})
	if err != nil {
		log.Printf("[JANITOR ERROR] Failed to register cron: %v", err)
		return
	}

	j.cron.Start()
	log.Println("[JANITOR] Docker hygiene cron scheduled for 03:00 AM daily")
}

func (j *Janitor) Stop() {
	j.cron.Stop()
}

// RunDockerPrune executes docker image prune for dangling layers older than 168h (7 days)
func RunDockerPrune() error {
	log.Println("[JANITOR] Running docker image prune -af --filter until=168h ...")
	cmd := exec.Command("docker", "image", "prune", "-af", "--filter", "until=168h")
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[JANITOR WARNING] docker prune returned error: %v, output: %s", err, string(output))
		return err
	}
	log.Printf("[JANITOR SUCCESS] Docker prune finished: %s", string(output))
	return nil
}
