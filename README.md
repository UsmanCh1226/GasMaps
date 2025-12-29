# Gas Maps - Interactive Route Planner

A beautiful, interactive map application built with React and Mapbox that allows users to:
- Enter a destination and get turn-by-turn directions
- View highlighted routes from current location to destination
- Find nearby gas stations with pricing information
- Experience Google Maps-like functionality with impressive styling

## Features

- 🗺️ **Interactive Map**: Powered by Mapbox with smooth navigation
- 🧭 **Route Planning**: Get directions from your current location to any destination
- ⛽ **Gas Station Finder**: Discover nearby gas stations with prices
- 📍 **Location Services**: Automatic current location detection
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Your Mapbox Access Token

1. Go to [Mapbox](https://account.mapbox.com/) and sign up/login
2. Navigate to [Access Tokens](https://account.mapbox.com/access-tokens/)
3. Copy your default public token (or create a new one)

### 3. Create Environment File

Create a `.env` file in the root directory:

```bash
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
```

Replace `your_mapbox_token_here` with your actual Mapbox access token.

### 4. Start the Development Server

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Usage

1. **Allow Location Access**: The app will request your current location when it loads
2. **Enter Destination**: Type your destination in the search bar at the top
3. **Get Route**: Click the "Route" button to calculate and display the route
4. **View Route Info**: See distance and estimated travel time
5. **Explore Gas Stations**: Click on gas station markers to see details

## Technologies Used

- React 18
- Mapbox GL JS
- react-map-gl
- Tailwind CSS
- Lucide React Icons

## Project Structure

```
src/
  ├── components/
  │   └── GasStationMap.jsx  # Main map component with routing
  ├── App.jsx
  └── index.js
```

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
