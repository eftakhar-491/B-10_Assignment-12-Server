# Scholarship Management System (Backend)

## Project Purpose

The backend of the Scholarship Management System is designed to provide a robust and scalable API for managing scholarships, applications, and user authentication. It serves as the core logic layer, handling data processing, storage, and communication between the frontend and database.

## Live URL

[Live API](#) _(https://scholorship-management.vercel.app)_

## Key Features

- **User Authentication:** Secure authentication using JWT tokens.
- **Scholarship Management:** CRUD operations for scholarships.
- **Application Tracking:** Manage application submissions and statuses.
- **Admin Control:** Role-based access control for administrators.
- **Database Integration:** Efficient data storage and retrieval using MongoDB.
- **API Documentation:** Comprehensive API documentation using Swagger.

## Technologies Used

- **Node.js:** JavaScript runtime environment for backend development.
- **Express.js:** Fast and lightweight web framework for handling API requests.
- **MongoDB:** NoSQL database for efficient data storage and retrieval.

## Installation

To set up the backend locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/Programming-Hero-Web-Course4/b10a12-server-side-eftakhar-491
   ```
2. Navigate to the project directory:
   ```bash
   cd scholarship-management-backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables in a `.env` file:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   PORT=5000
   ```
5. Start the development server:
   ```bash
   npm start
   ```

## NPM Packages Used

- **express:** Web framework for Node.js to create APIs.
- **mongoose:** ODM for MongoDB to manage database interactions.
- **jsonwebtoken:** Library for creating and verifying JWT tokens.
- **dotenv:** Loads environment variables from a `.env` file.
- **cors:** Enables Cross-Origin Resource Sharing.
- **nodemon:** Automatically restarts the server during development.

## Contribution

Contributions are welcome! If you'd like to contribute to this project, feel free to fork the repository and submit a pull request.

## Contact

For any inquiries or support, feel free to reach out at [eftt042@gmail.com](mailto:eftt042@email@gmail.com).
