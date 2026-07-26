package main

import (
	"log"
	"net/http"
)

func main() {
	store, err := NewStore("meshauth.db")
	if err != nil {
		log.Fatal(err)
	}

	authHandler := NewAuthHandler(store)

	http.HandleFunc("/api/register/begin", authHandler.BeginRegistration)
	http.HandleFunc("/api/register/complete", authHandler.CompleteRegistration)
	http.HandleFunc("/api/auth/begin", authHandler.BeginAuth)
	http.HandleFunc("/api/auth/complete", authHandler.CompleteAuth)

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
