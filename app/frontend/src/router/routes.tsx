/**
 * Router configuration for the Keiko Personal Assistant application.
 * Uses React Router v6 with lazy loading for optimal performance.
 */
import { RouteObject } from "react-router-dom";

import Chat from "../pages/chat/Chat";

/**
 * Application route definitions.
 * The layout wrapper is applied at the root level to ensure
 * header and sidebar remain persistent across all routes.
 */
export const routes: RouteObject[] = [
    {
        index: true,
        element: <Chat />
    },
    {
        path: "qa",
        lazy: () => import("../pages/ask/Ask")
    },
    {
        path: "doc-upload",
        lazy: () => import("../pages/doc-upload/DocUploadPage")
    },
    {
        path: "playground",
        lazy: () => import("../pages/playground/Playground")
    },
    {
        path: "news",
        lazy: () => import("../pages/news/NewsDashboard")
    },
    {
        path: "ideas",
        lazy: () => import("../pages/ideas/IdeaHub")
    },
    {
        path: "*",
        lazy: () => import("../pages/NoPage")
    }
];

export default routes;

