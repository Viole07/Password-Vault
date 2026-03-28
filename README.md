# 🔐 Password-Vault: Zero-Knowledge Password Manager

A secure, cross-platform password manager built with the **MERN Stack** and **Zero-Knowledge Architecture**. This vault ensures that sensitive data is encrypted/decrypted only on the client side, meaning the server never sees the user's master password or plain-text credentials.

## 🚀 Key Features
- **Zero-Knowledge Security**: All cryptographic operations occur in the browser. The server only stores "blind" AES-256 encrypted blobs.
- **Bank-Grade Key Derivation**: Implements **PBKDF2** with **600,000 iterations** to stretch the master password into a robust 256-bit key, mitigating brute-force attacks.
- **RAM-Only Session**: The decryption key is never stored in `localStorage` or cookies; it resides only in React state and is wiped upon page refresh or logout.
- **Local Validation**: Utilizes **SHA-256 fingerprints** to verify master passwords locally without sending them to the backend.
- **Clipboard Security**: Features an auto-clearing clipboard logic that purges copied passwords after 30 seconds.
- **Real-Time Validation**: Modern UI with live password strength checking (Regex-based).

## 🛠️ Tech Stack
- **Frontend**: React.js, Vite, Tailwind CSS, Lucide React (Icons).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB Atlas.
- **Crypto**: CryptoJS (AES-256, PBKDF2, SHA-256).
- **Auth**: JWT (JSON Web Tokens) with Bcrypt hashing for account credentials.

## 🏗️ Security Architecture
The system follows a "Blind Storage" model:
1. **Registration**: User chooses a password → Client derives a key → Server hashes and stores account credentials (not the key).
2. **Encryption**: Plaintext → `AES-256-CBC` (using Derived Key) → Encrypted Blob.
3. **Storage**: Client sends the *Blob* to the server. The server stores it but lacks the key to unlock it.
4. **Decryption**: Server sends *Blob* to Client → Client uses Master Password (in RAM) to decrypt.

## ⚙️ Installation & Setup

1. **Clone the Repo**
   ```bash
   git clone [https://github.com/Viole07/Password-Vault.git](https://github.com/Viole07/Password-Vault.git)
