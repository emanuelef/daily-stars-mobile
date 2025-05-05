# Daily Stars Tracker

Daily Stars Tracker is a React + TypeScript application built with Vite. It allows users to track the daily and cumulative stars of GitHub repositories in real-time. The app features a responsive chart, real-time updates via Server-Sent Events (SSE), and a progress bar with an estimated time of arrival (ETA) for fetching data.

## Features

- **GitHub Repository Tracking**: Enter a GitHub repository (e.g., `owner/repo`) to track its stars.
- **Real-Time Updates**: Uses Server-Sent Events (SSE) to fetch and display live updates.
- **Interactive Charts**: View daily and cumulative stars with zoomable and scrollable charts.
- **Progress Bar with ETA**: Displays the progress of data fetching with an estimated time of completion.
- **Dark Mode Support**: Toggle between light and dark themes for better accessibility.

## Tech Stack

- **React**: Frontend library for building the user interface.
- **TypeScript**: Strongly typed JavaScript for better code quality and maintainability.
- **Vite**: Fast development environment with hot module replacement (HMR).
- **Recharts**: Library for creating responsive and interactive charts.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **date-fns**: Library for date manipulation and formatting.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/daily-stars-tracker.git
   cd daily-stars-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory and add the following environment variable:

   ```env
   VITE_HOST=http://your-api-host
   ```

4. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open the app in your browser at [http://localhost:5173](http://localhost:5173).

## Usage

1. Enter a GitHub repository name (e.g., `facebook/react`) in the input field.
2. Click the "Fetch" button to start tracking the repository's stars.
3. View the daily and cumulative stars in the interactive chart.
4. Monitor the progress of data fetching with the progress bar and ETA.

## Scripts

- `npm run dev`: Start the development server.
- `npm run build`: Build the app for production.
- `npm run preview`: Preview the production build locally.
- `npm run lint`: Run ESLint to check for code quality issues.

## Folder Structure

```
src/
├── components/       # Reusable UI components
├── utils/            # Utility functions (e.g., data parsing, calculations)
├── styles/           # Global and component-specific styles
├── App.tsx           # Main application component
├── main.tsx          # Entry point for the app
└── index.html        # HTML template
```

## Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
