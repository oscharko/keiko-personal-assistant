/**
 * AnimatedOutlet component for smooth page transitions.
 * Wraps the React Router Outlet with framer-motion animations.
 */
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Animation variants for page transitions.
 */
const pageVariants = {
    initial: {
        opacity: 0,
        y: 10
    },
    animate: {
        opacity: 1,
        y: 0
    },
    exit: {
        opacity: 0,
        y: -10
    }
};

/**
 * Transition configuration for smooth animations.
 */
const pageTransition = {
    type: "tween" as const,
    ease: "easeInOut" as const,
    duration: 0.2
};

interface AnimatedOutletProps {
    className?: string;
}

/**
 * AnimatedOutlet provides smooth fade and slide transitions
 * when navigating between routes while keeping the layout
 * (header and sidebar) persistent.
 */
export const AnimatedOutlet = ({ className }: AnimatedOutletProps): JSX.Element => {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
                transition={pageTransition}
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
                <Outlet />
            </motion.div>
        </AnimatePresence>
    );
};

export default AnimatedOutlet;

