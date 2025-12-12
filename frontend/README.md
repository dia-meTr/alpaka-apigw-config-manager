# Alpaka Frontend

React.js application with a modern sidebar and header layout.

## Features

- **Header Component**: Fixed header with navigation and user profile
- **Sidebar Component**: Responsive sidebar with menu items
- **Main Layout**: Layout component that combines header and sidebar
- **Modern UI**: Clean and professional design

## Getting Started

### Installation

Install dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Build

Create a production build:

```bash
npm run build
```

## Project Structure

```
src/
  components/
    Header/
      Header.jsx
      Header.css
    Sidebar/
      Sidebar.jsx
      Sidebar.css
    MainLayout/
      MainLayout.jsx
      MainLayout.css
  App.jsx
  App.css
  index.js
  index.css
```

## Components

### Header
- Fixed position at the top
- Logo/brand name
- Navigation buttons
- User profile avatar

### Sidebar
- Fixed position on the left
- Menu items with icons
- Active state highlighting
- Responsive design

### MainLayout
- Combines Header and Sidebar
- Provides main content area
- Responsive layout structure

