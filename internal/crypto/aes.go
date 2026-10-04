package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"strings"

	"golang.org/x/crypto/hkdf"
)

func deriveKey(master string) []byte {
	r := hkdf.New(sha256.New, []byte(master), []byte("spanel-v1-salt"), []byte("spanel aes-256-gcm"))
	k := make([]byte, 32)
	_, _ = io.ReadFull(r, k)
	return k
}

// Encrypt encrypts plaintext using AES-256-GCM with HKDF and AAD (v2)
func Encrypt(plaintext, masterKey, aad string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	key := deriveKey(masterKey)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), []byte(aad))
	return "v2:" + base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts ciphertext, supporting both v1 (legacy) and v2 (HKDF+AAD)
func Decrypt(encodedCiphertext, masterKey, aad string) (string, error) {
	if encodedCiphertext == "" {
		return "", nil
	}

	isV2 := strings.HasPrefix(encodedCiphertext, "v2:")
	if isV2 {
		encodedCiphertext = strings.TrimPrefix(encodedCiphertext, "v2:")
	}

	ciphertext, err := base64.StdEncoding.DecodeString(encodedCiphertext)
	if err != nil {
		return "", err
	}

	var key []byte
	if isV2 {
		key = deriveKey(masterKey)
	} else {
		// V1 legacy key derivation
		h := sha256.Sum256([]byte(masterKey))
		key = h[:]
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("malformed ciphertext")
	}

	nonce, actualCiphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	var additionalData []byte
	if isV2 {
		additionalData = []byte(aad)
	}

	plaintext, err := gcm.Open(nil, nonce, actualCiphertext, additionalData)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
