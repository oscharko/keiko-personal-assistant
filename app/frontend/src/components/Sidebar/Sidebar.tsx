import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton, Icon, Spinner, SpinnerSize } from "@fluentui/react";
import { useTranslation } from "react-i18next";
import { useMsal } from "@azure/msal-react";

import styles from "./Sidebar.module.css";
import keikoLogo from "../../assets/Logo_Keiko_DCFF4A.svg";
import { configApi } from "../../api";
import { getToken, useLogin } from "../../authConfig";
import { HistoryButton } from "../HistoryButton";
import { useHistoryManager } from "../HistoryProviders";
import { HistoryMetaData, HistoryProviderOptions } from "../HistoryProviders/IProvider";
import { HISTORY_SELECT_EVENT } from "../HistoryProviders/events";

interface SidebarProps {
    className?: string;
}

const HISTORY_COUNT_PER_LOAD = 20;

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    const { t } = useTranslation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyItems, setHistoryItems] = useState<HistoryMetaData[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [showChatHistoryBrowser, setShowChatHistoryBrowser] = useState(false);
    const [showChatHistoryCosmos, setShowChatHistoryCosmos] = useState(false);

    const hasMoreHistoryRef = useRef(false);
    const isHistoryLoadingRef = useRef(false);
    const historyListRef = useRef<HTMLDivElement | null>(null);

    const client = useLogin ? useMsal().instance : undefined;

    useEffect(() => {
        configApi().then(config => {
            setShowChatHistoryBrowser(config.showChatHistoryBrowser);
            setShowChatHistoryCosmos(config.showChatHistoryCosmos);
        });
    }, []);

    const historyProvider = useMemo(() => {
        if (useLogin && showChatHistoryCosmos) return HistoryProviderOptions.CosmosDB;
        if (showChatHistoryBrowser) return HistoryProviderOptions.IndexedDB;
        return HistoryProviderOptions.None;
    }, [showChatHistoryBrowser, showChatHistoryCosmos]);

    const historyManager = useHistoryManager(historyProvider);
    const historySupported = historyProvider !== HistoryProviderOptions.None;

    useEffect(() => {
        hasMoreHistoryRef.current = hasMoreHistory;
    }, [hasMoreHistory]);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    useEffect(() => {
        if (isCollapsed) {
            setIsHistoryOpen(false);
        }
    }, [isCollapsed]);

    const loadHistory = useCallback(async () => {
        if (!historySupported || isHistoryLoadingRef.current || !hasMoreHistoryRef.current) {
            return;
        }
        isHistoryLoadingRef.current = true;
        setIsHistoryLoading(true);
        try {
            const token = client ? await getToken(client) : undefined;
            const items = await historyManager.getNextItems(HISTORY_COUNT_PER_LOAD, token);
            if (items.length === 0) {
                setHasMoreHistory(false);
                hasMoreHistoryRef.current = false;
                return;
            }
            setHistoryItems(prev => [...prev, ...items]);
        } finally {
            isHistoryLoadingRef.current = false;
            setIsHistoryLoading(false);
        }
    }, [client, historyManager, historySupported]);

    useEffect(() => {
        if (!isHistoryOpen || !historySupported) return;
        historyManager.resetContinuationToken();
        setHistoryItems([]);
        setHasMoreHistory(true);
        hasMoreHistoryRef.current = true;
        void loadHistory();
    }, [historyManager, historySupported, isHistoryOpen, loadHistory]);

    const handleHistoryScroll = () => {
        const list = historyListRef.current;
        if (!list) return;
        const nearBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 12;
        if (nearBottom) {
            void loadHistory();
        }
    };

    const handleHistorySelect = (id: string) => {
        window.dispatchEvent(new CustomEvent(HISTORY_SELECT_EVENT, { detail: { id } }));
    };

    const menuItems = [
        { icon: "Edit", label: "New chat" },
        { icon: "Search", label: "Search chats" },
        { icon: "Pulse", label: "Pulse" },
        { icon: "Library", label: "Library" },
        { icon: "Code", label: "Codex" },
        { icon: "World", label: "Atlas" },
        { icon: "AppIconDefault", label: "GPTs" }
    ];

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : styles.expanded} ${className || ""}`}>
            <div className={styles.header}>
                {!isCollapsed && <img src={keikoLogo} alt="Keiko" className={styles.logo} />}
                <button className={styles.toggleButton} onClick={toggleSidebar} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                    <Icon iconName={isCollapsed ? "DoubleChevronRight12" : "DoubleChevronLeft12"} />
                </button>
            </div>

            <div className={styles.menuItems}>
                {menuItems.map((item, index) => (
                    <div key={index} className={styles.menuItem} title={isCollapsed ? item.label : undefined}>
                        <div className={styles.menuItemIcon}>
                            <Icon iconName={item.icon} />
                        </div>
                        <span className={styles.menuItemText}>{item.label}</span>
                    </div>
                ))}

                <div className={styles.divider} />

{/*                <div className={styles.menuItem}>
                    <div className={styles.menuItemIcon}>
                        <Icon iconName="ProjectCollection" />
                    </div>
                    <span className={styles.menuItemText}>Projects &gt;</span>
                </div>*/}

                {historySupported && (
                    <div className={styles.historySection}>
                        <HistoryButton className={styles.historyHeader} isOpen={isHistoryOpen} onClick={() => setIsHistoryOpen(prev => !prev)} />
                        {isHistoryOpen && !isCollapsed && (
                            <div className={styles.historyList} ref={historyListRef} onScroll={handleHistoryScroll}>
                                {historyItems.map(item => (
                                    <button
                                        key={item.id}
                                        className={styles.historyItem}
                                        onClick={() => handleHistorySelect(item.id)}
                                        title={item.title}
                                        type="button"
                                    >
                                        {item.title}
                                    </button>
                                ))}
                                {isHistoryLoading && <Spinner size={SpinnerSize.xSmall} className={styles.spinner} />}
                                {!isHistoryLoading && historyItems.length === 0 && (
                                    <div className={styles.noHistory}>{t("history.noHistory")}</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <div className={styles.userProfile}>
                    <div className={styles.avatar}>OS</div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>Oliver Scharkowski</span>
                        {/*<span className={styles.userStatus}>Pro</span>*/}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
