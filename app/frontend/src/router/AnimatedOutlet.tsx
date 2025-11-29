/**
 * AnimatedOutlet component for smooth page transitions.
 * Wraps the React Router Outlet with framer-motion animations.
 *
 * Animation behavior:
 * - Current view fades out with subtle scale-down and upward movement
 * - New view fades in with subtle scale-up and downward movement
 *
 * Uses useOutlet() hook to "freeze" the outlet content during exit animations,
 * preventing the flickering issue that occurs with the standard <Outlet /> component.
 */
import { useLocation, useOutlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedOutletProps {
    className?: string;
}

/**
 * Animation variants for page transitions.
 * Uses a combination of opacity, scale, and y-transform for a modern feel.
 */
const pageVariants = {
    initial: {
        opacity: 0,
        scale: 0.96,
        y: 8
    },
    enter: {
        opacity: 1,
        scale: 1,
        y: 0
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        y: -8
    }
};

/**
 * Transition configuration with custom easing for smooth animations.
 * Uses a cubic-bezier curve for a natural, premium feel.
 */
const pageTransition = {
    type: "tween" as const,
    ease: [0.25, 0.1, 0.25, 1.0] as const,
    duration: 0.3
};

/**
 * AnimatedOutlet provides smooth fade-scale transitions
 * when navigating between routes while keeping the layout
 * (header and sidebar) persistent.
 *
 * The useOutlet() hook captures the current outlet element, which is then
 * wrapped in a motion.div. This ensures the exiting view maintains its content
 * during the exit animation instead of immediately switching to the new route.
 */
export const AnimatedOutlet = ({ className }: AnimatedOutletProps): JSX.Element => {
    const location = useLocation();
    const outlet = useOutlet();

    return (
        <div
            className={className}
            style={{
                display: "flex",
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                position: "relative",
                width: "100%"
            }}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={location.pathname}
                    variants={pageVariants}
                    initial="initial"
                    animate="enter"
                    exit="exit"
                    transition={pageTransition}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        flex: 1,
                        width: "100%",
                        height: "100%",
                        willChange: "opacity, transform"
                    }}
                >
                    {outlet}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AnimatedOutlet;

