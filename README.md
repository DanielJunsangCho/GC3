## Prerequisites
Ensure you have the following installed:
- **[MongoDB Community Edition 8.0](https://www.mongodb.com/try/download/community)**
- **[Node.js & npm](https://nodejs.org/en)**
- **[Python 3](https://www.python.org/downloads/)**

---

## Install & Manage MongoDB

### Install MongoDB (macOS)
```sh
brew tap mongodb/brew
brew update
brew install mongodb-community@8.0
```

### Start MongoDB
```sh
brew services start mongodb-community@8.0
```

### Stop MongoDB
```sh
brew services stop mongodb-community@8.0
```

---

## Running the Application

### Start the Frontend
1. Navigate into the frontend folder:
    ```sh
    cd frontend
    ```
2. Install dependencies (if not installed yet):
    ```sh
    npm install @mui/material @emotion/react @emotion/styled
    npm install @mui/icons-material
    npm install react-select
    npm install
    ```
3. Start the development server:
    ```sh
    npm run dev
    ```

### Start the Backend
1. Navigate into the backend folder:
    ```sh
    cd backend
    ```
2. Install required Python packages (if not installed yet):
    ```sh
    pip install Flask gridfs matplotlib
    ```
3. Start the Flask server:
    ```sh
    python3 app.py
    ```
