// Copyright (c) 2024-2026 Soumya Debnath. All Rights Reserved.
// Licensed under the Business Source License 1.1 (BSL 1.1).
// See LICENSE file for details. Production use requires a paid license.
// Contact: soumyadebnath1619@gmail.com | +91 7031648617

package main

import (
	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

type Store struct {
	db *sql.DB
}

func NewStore(dbPath string) (*Store, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS credentials (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL,
			public_key TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return nil, err
	}

	return &Store{db: db}, nil
}

func (s *Store) SaveCredential(id, username, pubKey string) error {
	_, err := s.db.Exec("INSERT INTO credentials (id, username, public_key) VALUES (?, ?, ?)", id, username, pubKey)
	return err
}

func (s *Store) GetPublicKey(username, id string) (string, error) {
	var pubKey string
	err := s.db.QueryRow("SELECT public_key FROM credentials WHERE username = ? AND id = ?", username, id).Scan(&pubKey)
	return pubKey, err
}
