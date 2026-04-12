import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import App from "./App";
import AppErrorBoundary from "./components/AppErrorBoundary";
import "@mantine/core/styles.css";
import "katex/dist/katex.min.css";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootElement).render(
  <AppErrorBoundary>
    <MantineProvider defaultColorScheme="auto">
      <App />
    </MantineProvider>
  </AppErrorBoundary>,
);
