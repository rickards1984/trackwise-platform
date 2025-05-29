import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { ChakraProvider } from "@chakra-ui/react"; // ✅ Chakra

createRoot(document.getElementById("root")!).render(
  <ChakraProvider>
    <ThemeProvider defaultTheme="light" attribute="class">
      <App />
    </ThemeProvider>
  </ChakraProvider>
);
