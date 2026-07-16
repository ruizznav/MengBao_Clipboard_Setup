import { createHashRouter } from "react-router-dom";
import Main from "@/pages/Main";
import Preference from "@/pages/Preference";
import Screenshot from "@/pages/Screenshot";

export const router = createHashRouter([
  {
    Component: Main,
    path: "/",
  },
  {
    Component: Preference,
    path: "/preference",
  },
  {
    Component: Screenshot,
    path: "/screenshot",
  },
]);
