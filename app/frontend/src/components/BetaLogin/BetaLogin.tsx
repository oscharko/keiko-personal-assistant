import {useState} from "react";
import {MessageBar, MessageBarType, PrimaryButton, Stack, Text, TextField} from "@fluentui/react";
import styles from "./BetaLogin.module.css";
import {MouseEffect} from "../MouseEffect/MouseEffect";
import keikoLogo from "../../assets/Logo_Keiko_DCFF4A.svg";

interface BetaLoginProps {
    onLoginSuccess: (token: string, username: string) => void;
}

export const BetaLogin = ({onLoginSuccess}: BetaLoginProps) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!username || !password) {
            setError("Bitte Username und Passwort eingeben");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({username, password})
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Login fehlgeschlagen");
            }

            const data = await response.json();
            localStorage.setItem("beta_auth_token", data.token);
            localStorage.setItem("beta_auth_username", data.username);
            if (data.userId) {
                localStorage.setItem("beta_auth_user_id", data.userId);
            }
            if (data.isAdmin) {
                localStorage.setItem("beta_auth_is_admin", "true");
            } else {
                localStorage.removeItem("beta_auth_is_admin");
            }
            onLoginSuccess(data.token, data.username);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login fehlgeschlagen");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleLogin();
        }
    };

    return (
        <>
            <MouseEffect/>
            <div className={styles.container}>
                <div className={styles.loginBox}>
                    <Stack tokens={{childrenGap: 20}}>
                        <Text variant="xxLarge" className={styles.title}>
                            Keiko Personal Assistant
                        </Text>
                        <img src={keikoLogo} className={styles.logo} alt="App logo"
                             style={{width: "80px", height: "80px", transform: "scaleX(-1)"}}/>

                        {error && (
                            <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>
                                {error}
                            </MessageBar>
                        )}

                        <TextField
                            label="Username"
                            value={username}
                            onChange={(_, newValue) => setUsername(newValue || "")}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            autoComplete="username"
                        />

                        <TextField
                            label="Passwort"
                            type="password"
                            value={password}
                            onChange={(_, newValue) => setPassword(newValue || "")}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            autoComplete="current-password"
                            canRevealPassword
                        />

                        <PrimaryButton
                            text={isLoading ? "Anmelden..." : "Anmelden"}
                            onClick={handleLogin}
                            disabled={isLoading}
                            styles={{
                                root: {
                                    backgroundColor: '#DCFF4A',
                                    borderColor: '#DCFF4A',
                                    color: '#000000'
                                },
                                rootHovered: {
                                    backgroundColor: '#c8eb36',
                                    borderColor: '#ffffff',
                                    color: '#333333'
                                },
                                rootPressed: {
                                    backgroundColor: '#b4d722',
                                    borderColor: '#b4d722',
                                    color: '#333333'
                                },
                                rootDisabled: {
                                    backgroundColor: '#666666',
                                    borderColor: '#666666',
                                    color: '#999999'
                                }
                            }}
                        />

                        <Text variant="small" className={styles.info}>
                            Dies ist eine Beta-Version. Bitte verwenden Sie die Ihnen zugewiesenen Zugangsdaten.
                        </Text>
                    </Stack>
                </div>
            </div>
        </>
    );
};

