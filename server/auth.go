package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
)

type AuthHandler struct {
	store *Store
}

func NewAuthHandler(store *Store) *AuthHandler {
	return &AuthHandler{store: store}
}

func generateChallenge() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func (h *AuthHandler) BeginRegistration(w http.ResponseWriter, r *http.Request) {
	var req RegistrationBeginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	userIDBytes := make([]byte, 16)
	rand.Read(userIDBytes)

	resp := RegistrationBeginResponse{
		Challenge: generateChallenge(),
		UserID:    base64.RawURLEncoding.EncodeToString(userIDBytes),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *AuthHandler) CompleteRegistration(w http.ResponseWriter, r *http.Request) {
	var req RegistrationCompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := h.store.SaveCredential(req.CredID, req.Username, req.PubKey)
	if err != nil {
		http.Error(w, "Failed to save credential", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

func (h *AuthHandler) BeginAuth(w http.ResponseWriter, r *http.Request) {
	resp := AuthBeginResponse{
		Challenge: generateChallenge(),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *AuthHandler) CompleteAuth(w http.ResponseWriter, r *http.Request) {
	var req AuthCompleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := h.store.GetPublicKey(req.Username, req.CredID)
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token := "jwt_token_for_" + req.Username

	resp := AuthCompleteResponse{Token: token}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
