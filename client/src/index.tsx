import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {greetingAPI} from "./Greeting";
// import {SERVER_URLS} from "./generated/config"
//
// // const serverUrl = "https://practice-tests-backend-manual.us-west-2.elasticbeanstalk.com"
// const stage = process.env.REACT_APP_STAGE
// const url = SERVER_URLS[stage??'dev']
//
// console.log(stage)
// console.log(`${url}/guifan-user`)

greetingAPI.get()

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
