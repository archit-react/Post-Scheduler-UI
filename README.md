# Post Scheduler UI

A modern and responsive scheduling tool built with React, TypeScript, Tailwind CSS, and Vite. Users can schedule posts, receive audio reminders 1 minute before the scheduled time, and manage content using a minimal glassmorphic interface. 

---

## Live Demo

** [Watch Live Demo](https://post-scheduler-ui.vercel.app/)**

## Features

- Schedule posts with custom date and time
- Audio reminder plays one minute before the scheduled time
- Persistent storage via localStorage
- Edit and delete scheduled posts
- Clear all scheduled posts
- Responsive, dark-themed UI using Tailwind CSS
- Local timezone-aware rendering
- Prevents duplicate notifications using a Set (`shownToastIds`) ← (NEW FEATURE)

---

## Tech Stack

| Category    | Libraries/Tools                 |
| ----------- | ------------------------------- |
| Framework   | React, TypeScript               |
| Build Tool  | Vite                            |
| Styling     | Tailwind CSS                    |
| Date Picker | react-datepicker                |
| Utilities   | uuid, date-fns, react-hot-toast |

---

## Reminder Logic

- Polls every 30 seconds for upcoming posts
- When a post is 1 minute away:
  - Displays a toast notification
  - Plays the reminder audio file (reminder.mp3)
- Audio playback only occurs if the tab is visible
- Ensures reminders do not repeat using:
  - `notified` flag
  - `shownToastIds` set (prevents duplicate reminders even if state lags)

---

## Folder Structure

```
POST-SCHEDULER-UI/
├── public/
│   ├── reminder.mp3        # Audio alert
│   └── bg.png              # Background image
├── src/
│   ├── pages/
│   │   └── Home.tsx        # Core logic and UI
│   ├── components/
│   │   └── ErrorBoundary.tsx
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── assets/
├── tailwind.config.js
├── vite.config.ts
├── package.json
└── README.md
```

---

## Getting Started

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

### Reminder Audio

Ensure `reminder.mp3` exists in the `/public` directory.

---

## Fixes and Improvements

- Fixed an issue where the alarm would not replay for new sessions
- Introduced logic to reset `notified` status on:
  - Initial load from localStorage
  - Post creation
  - Post edit
- Added `shownToastIds` Set to globally track shown reminders
- Eliminated duplicate toasts appearing simultaneously for same post

---

## Author

Created by [Archit Sharma]

- [GitHub](https://github.com/archit-react)
- [LinkedIn](https://www.linkedin.com/in/archit-react)
- [Portfolio](https://architsharma.netlify.app)

---

## License

This project is licensed under the MIT License.
