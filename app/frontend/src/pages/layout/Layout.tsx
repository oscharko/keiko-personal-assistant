import React, {RefObject, useEffect, useRef, useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import styles from "./Layout.module.css";

import {useLogin} from "../../authConfig";

import {LoginButton} from "../../components/LoginButton";
import {IconButton} from "@fluentui/react";
import {motion} from "framer-motion";
import Sidebar from "../../components/Sidebar/Sidebar";
import {MouseEffect} from "../../components/MouseEffect/MouseEffect";
import {AnimatedOutlet} from "../../router";

const Layout = () => {
    const {t, i18n} = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isBetaAuth, setIsBetaAuth] = useState(false);
    const menuRef: RefObject<HTMLDivElement> = useRef(null);

    // Toggle between English and German
    const toggleLanguage = () => {
        const newLang = i18n.language === "de" ? "en" : "de";
        i18n.changeLanguage(newLang);
    };

    // Get current language display text
    const getCurrentLanguageLabel = () => {
        return i18n.language === "de" ? "DE" : "EN";
    };

    const FloatingPaths = ({position}: { position: number }) => {
        const paths = Array.from({length: 30}, (_, i) => ({
            id: i,
            d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position
            } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position
            } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position
            } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
            color: `rgba(15,23,42,${0.1 + i * 0.03})`,
            width: 0.5 + i * 0.03,
        }));

        return (
            <div className={styles.floatingPaths01}>
                <svg className={styles.floatingPaths02} viewBox='0 0 696 316' fill='none'>
                    {paths.map((path) => (
                        <motion.path
                            key={path.id}
                            d={path.d}
                            stroke='currentColor'
                            strokeWidth={path.width}
                            strokeOpacity={0.1 + path.id * 0.03}
                            initial={{pathLength: 0.3, opacity: 0.6}}
                            animate={{
                                pathLength: 1,
                                opacity: [0.3, 0.6, 0.3],
                                pathOffset: [0, 1, 0],
                            }}
                            transition={{
                                duration: 20 + Math.random() * 10,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: 'linear',
                            }}
                        />
                    ))}
                </svg>
            </div>
        );
    }

    // Check if beta auth is enabled
    useEffect(() => {
        const checkBetaAuth = async () => {
            try {
                const response = await fetch("/auth/status");
                if (response.ok) {
                    const data = await response.json();
                    setIsBetaAuth(data.betaAuthEnabled || false);
                }
            } catch {
                // Ignore errors
            }
        };
        checkBetaAuth();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("beta_auth_token");
        localStorage.removeItem("beta_auth_username");
        window.location.reload();
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setMenuOpen(false);
        }
    };

    useEffect(() => {
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    return (
        <>
            <MouseEffect/>
            {/*            <div className={styles.floatingPaths}>
                <FloatingPaths position={-1}/>
                <FloatingPaths position={1}/>
            </div>*/}
            <div className={styles.layout}>
                <header className={styles.header} role={"banner"}>
                    <div className={styles.headerContainer} ref={menuRef}>
                        <Link to="/" className={styles.headerTitleContainer}>
                            <h3 className={styles.headerTitle}>{t("headerTitle")}</h3>
                        </Link>
                        <h2 className={styles.headerCenterTitle}>{t("headerCenterTitle")}</h2>
                        <div className={styles.loginMenuContainer}>
                            {useLogin && <LoginButton/>}
                            <button
                                className={styles.languageButton}
                                onClick={toggleLanguage}
                                title={t("labels.languagePicker")}
                                aria-label={t("labels.languagePicker")}
                            >
                                {getCurrentLanguageLabel()}
                            </button>
                            {isBetaAuth && (
                                <IconButton
                                    iconProps={{iconName: "SignOut"}}
                                    title={t("logout")}
                                    ariaLabel={t("logout")}
                                    onClick={handleLogout}
                                    styles={{
                                        root: {
                                            backgroundColor: "#DCFF4A",
                                            color: "#000",
                                            marginLeft: "8px",
                                            borderRadius: "20%"
                                        },
                                        rootHovered: {
                                            backgroundColor: "#fff",
                                            color: "#000",
                                            borderRadius: "20%"
                                        }
                                    }}
                                />
                            )}
                            <IconButton
                                iconProps={{iconName: "GlobalNavButton"}}
                                className={styles.menuToggle}
                                onClick={toggleMenu}
                                ariaLabel={t("labels.toggleMenu")}
                            />
                        </div>
                    </div>
                </header>

                <div className={styles.contentContainer}>
                    <Sidebar/>
                    <main className={styles.main} id="main-content">
                        <AnimatedOutlet/>
                    </main>
                </div>
            </div>
        </>
    );
};

export default Layout;
