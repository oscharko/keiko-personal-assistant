import { useState, useEffect, ReactNode } from "react";
import { BetaLogin } from "../BetaLogin";

interface BetaAuthWrapperProps {
    children: ReactNode;
}

export const BetaAuthWrapper = ({ children }: BetaAuthWrapperProps) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [betaAuthEnabled, setBetaAuthEnabled] = useState(false);

    useEffect(() => {
        checkBetaAuth();
    }, []);

    const checkBetaAuth = async () => {
        try {
            // Check if beta auth is enabled using the status endpoint
            const response = await fetch("/auth/status");

            if (response.ok) {
                const data = await response.json();
                if (data.betaAuthEnabled) {
                    setBetaAuthEnabled(true);
                    // Check if we have a valid token
                    const token = localStorage.getItem("beta_auth_token");
                    if (token) {
                        // Validate token by making a test request
                        const testResponse = await fetch("/config", {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (testResponse.ok) {
                            setIsAuthenticated(true);
                        } else {
                            // Token invalid, clear it
                            localStorage.removeItem("beta_auth_token");
                            localStorage.removeItem("beta_auth_username");
                            localStorage.removeItem("beta_auth_user_id");
                            localStorage.removeItem("beta_auth_is_admin");
                        }
                    }
                } else {
                    // Beta auth not enabled
                    setBetaAuthEnabled(false);
                    setIsAuthenticated(true);
                }
            } else {
                // On error, assume beta auth is not enabled
                setBetaAuthEnabled(false);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error("Error checking beta auth:", error);
            // On error, assume beta auth is not enabled
            setBetaAuthEnabled(false);
            setIsAuthenticated(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginSuccess = (token: string, username: string) => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem("beta_auth_token");
        localStorage.removeItem("beta_auth_username");
        localStorage.removeItem("beta_auth_user_id");
        localStorage.removeItem("beta_auth_is_admin");
        setIsAuthenticated(false);
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (betaAuthEnabled && !isAuthenticated) {
        return <BetaLogin onLoginSuccess={handleLoginSuccess} />;
    }

    return <>{children}</>;
};

export default BetaAuthWrapper;
