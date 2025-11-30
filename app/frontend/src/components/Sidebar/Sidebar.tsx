import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Icon, Spinner, SpinnerSize} from "@fluentui/react";
import {useTranslation} from "react-i18next";
import {useMsal} from "@azure/msal-react";
import {useNavigate} from "react-router-dom";

import styles from "./Sidebar.module.css";
import {configApi} from "../../api";
import {getToken, useLogin} from "../../authConfig";
import {HistoryButton} from "../HistoryButton";
import {useHistoryManager} from "../HistoryProviders";
import {HistoryMetaData, HistoryProviderOptions} from "../HistoryProviders/IProvider";
import {CLEAR_CHAT_EVENT, HISTORY_SELECT_EVENT} from "../HistoryProviders/events";
import {ClearChatButton} from "../ClearChatButton";
import {IdeasButton} from "../IdeasButton";
import {NewsButton} from "../NewsButton";
import {SettingsButton} from "../SettingsButton";
import {UploadButton} from "../UploadButton";
import {YoursButton} from "../YoursButton";

interface SidebarProps {
    className?: string;
}

const HISTORY_COUNT_PER_LOAD = 20;

const Sidebar: React.FC<SidebarProps> = ({className}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isYoursOpen, setIsYoursOpen] = useState(false);
    const [historyItems, setHistoryItems] = useState<HistoryMetaData[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [showChatHistoryBrowser, setShowChatHistoryBrowser] = useState(false);
    const [showChatHistoryCosmos, setShowChatHistoryCosmos] = useState(false);
    const [showUserUpload, setShowUserUpload] = useState(false);
    const hasMoreHistoryRef = useRef(false);
    const isHistoryLoadingRef = useRef(false);
    const historyListRef = useRef<HTMLDivElement | null>(null);

    const client = useLogin ? useMsal().instance : undefined;

    useEffect(() => {
        configApi().then(config => {
            setShowChatHistoryBrowser(config.showChatHistoryBrowser);
            setShowChatHistoryCosmos(config.showChatHistoryCosmos);
            setShowUserUpload(config.showUserUpload);
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
        globalThis.dispatchEvent(new CustomEvent(HISTORY_SELECT_EVENT, {detail: {id}}));
    };

    return (
        <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : styles.expanded} ${className || ""}`}>
            <div className={styles.header}>
                <button className={styles.toggleButton} onClick={toggleSidebar}
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                    <Icon iconName={isCollapsed ? "DoubleChevronRight12" : "DoubleChevronLeft12"}/>
                </button>
            </div>

            <div className={styles.menuItems}>

                <div className={styles.historySection}>
                    <ClearChatButton className={styles.historyHeader}
                                     onClick={() => globalThis.dispatchEvent(new Event(CLEAR_CHAT_EVENT))}/>
                </div>

                <div className={styles.divider}/>

                <div className={styles.historySection}>
                    <YoursButton label={'Yours'} className={styles.historyHeader} isOpen={isYoursOpen}
                                 onClick={() => setIsYoursOpen(prev => !prev)}/>
                    {isYoursOpen && !isCollapsed && (
                        <div className={styles.historyList}>
                            <SettingsButton className={styles.historyHeader}
                                            onClick={() => navigate("/playground")}/>
                            <NewsButton className={styles.historyHeader}
                                        onClick={() => navigate("/news")}/>
                            <IdeasButton className={styles.historyHeader}
                                         onClick={() => navigate("/ideas")}/>
                            <UploadButton
                                className={styles.historyHeader}
                                onClick={() => navigate("/doc-upload")}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.divider}/>

                <div className={styles.historySection}>
                    <HistoryButton className={styles.historyHeader} isOpen={isHistoryOpen}
                                   onClick={() => setIsHistoryOpen(prev => !prev)}/>
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
                            {isHistoryLoading && <Spinner size={SpinnerSize.xSmall} className={styles.spinner}/>}
                            {!isHistoryLoading && historyItems.length === 0 && (
                                <div className={styles.noHistory}>{t("history.noHistory")}</div>
                            )}
                        </div>
                    )}
                </div>
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
