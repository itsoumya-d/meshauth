// Copyright (c) 2024-2026 Soumya Debnath. All Rights Reserved.
// Licensed under the Business Source License 1.1 (BSL 1.1).
// See LICENSE file for details. Production use requires a paid license.
// Contact: soumyadebnath1619@gmail.com | +91 7031648617

package main

type RegistrationBeginRequest struct {
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
}

type RegistrationBeginResponse struct {
	Challenge string `json:"challenge"`
	UserID    string `json:"userId"`
}

type RegistrationCompleteRequest struct {
	Username string `json:"username"`
	CredID   string `json:"credId"`
	PubKey   string `json:"pubKey"` // Base64 encoded
}

type AuthBeginRequest struct {
	Username string `json:"username"`
}

type AuthBeginResponse struct {
	Challenge string `json:"challenge"`
}

type AuthCompleteRequest struct {
	Username  string `json:"username"`
	CredID    string `json:"credId"`
	Signature string `json:"signature"`
}

type AuthCompleteResponse struct {
	Token string `json:"token"`
}
