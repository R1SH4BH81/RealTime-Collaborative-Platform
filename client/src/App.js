import React, { useEffect, useRef, useState } from "react";
import { Navbar, NavbarBrand, UncontrolledTooltip } from "reactstrap";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { DefaultEditor } from "react-simple-wysiwyg";
import Avatar from "react-avatar";

import "./App.css";

const WS_URL = process.env.REACT_APP_WS_URL;
console.log("WebSocket URL:", WS_URL);
let s = new WebSocket(WS_URL);
s.onopen = () => console.log("Connected!");
s.onmessage = (msg) => console.log("Message:", msg.data);

function isUserEvent(message) {
  let evt = JSON.parse(message.data);
  return evt.type === "userevent";
}

function isDocumentEvent(message) {
  let evt = JSON.parse(message.data);
  return evt.type === "contentchange";
}

function App() {
  const [username, setUsername] = useState("");
  const { sendJsonMessage, readyState } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log("WebSocket connection established.");
    },
    share: true,
    filter: () => false,
    retryOnError: true,
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (username && readyState === ReadyState.OPEN) {
      sendJsonMessage({
        username,
        type: "userevent",
      });
    }
  }, [username, sendJsonMessage, readyState]);

  return (
    <>
      <Navbar color="light" light>
        <NavbarBrand href="/">Real-time document editor</NavbarBrand>
      </Navbar>
      <div className="container-fluid">
        {username ? <EditorSection /> : <LoginSection onLogin={setUsername} />}
      </div>
    </>
  );
}

function LoginSection({ onLogin }) {
  const [username, setUsername] = useState("");
  useWebSocket(WS_URL, {
    share: true,
    filter: () => false,
  });
  function logInUser() {
    if (!username.trim()) {
      return;
    }
    onLogin && onLogin(username);
  }

  return (
    <div className="account">
      <div className="account__wrapper">
        <div className="account__card">
          <div className="account__profile">
            <p className="account__name">Hello, user!</p>
            <p className="account__sub">Join to edit the document</p>
          </div>
          <input
            name="username"
            onInput={(e) => setUsername(e.target.value)}
            className="form-control"
          />
          <button
            type="button"
            onClick={() => logInUser()}
            className="btn btn-primary account__btn"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

function History() {
  console.log("history");
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent,
  });
  const activities = lastJsonMessage?.data.userActivity || [];
  return (
    <ul>
      {activities.map((activity, index) => (
        <li key={`activity-${index}`}>{activity}</li>
      ))}
    </ul>
  );
}

function Users() {
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent,
  });
  const users = Object.values(lastJsonMessage?.data.users || {});
  return users.map((user) => (
    <div key={user.username}>
      <span id={user.username} className="userInfo" key={user.username}>
        <Avatar name={user.username} size={40} round="20px" />
      </span>
      <UncontrolledTooltip placement="top" target={user.username}>
        {user.username}
      </UncontrolledTooltip>
    </div>
  ));
}

function EditorSection() {
  return (
    <div className="main-content">
      <div className="document-holder">
        <div className="currentusers">
          <Users />
        </div>
        <Document />
      </div>
      <div className="history-holder">
        <History />
      </div>
    </div>
  );
}

function Document() {
  const { lastJsonMessage, sendJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isDocumentEvent,
  });

  const [localHtml, setLocalHtml] = useState(
    lastJsonMessage?.data.editorContent || ""
  );
  const debounceTimer = useRef(null);

  // Update local editor content when receiving updates from others
  useEffect(() => {
    if (lastJsonMessage?.data?.editorContent !== undefined) {
      setLocalHtml(lastJsonMessage.data.editorContent);
    }
  }, [lastJsonMessage]);

  function handleHtmlChange(e) {
    const value = e.target.value;
    setLocalHtml(value);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      sendJsonMessage({
        type: "contentchange",
        content: value,
      });
    }, 800);
  }

  return <DefaultEditor value={localHtml} onChange={handleHtmlChange} />;
}

export default App;
