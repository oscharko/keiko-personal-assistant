import React, { useState } from "react";
import { IconButton, Icon } from "@fluentui/react";
import styles from "./Sidebar.module.css";
import keikoLogo from "../../assets/Logo_Keiko_DCFF4A.svg"; // Assuming this path is correct based on Chat.tsx

interface SidebarProps {
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const menuItems = [
        { icon: "Edit", label: "New chat" },
        { icon: "Search", label: "Search chats" },
        { icon: "Pulse", label: "Pulse" },
        { icon: "Library", label: "Library" },
        { icon: "Code", label: "Codex" },
        { icon: "World", label: "Atlas" },
        { icon: "AppIconDefault", label: "GPTs" },
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

                <div className={styles.menuItem}>
                    <div className={styles.menuItemIcon}>
                        <Icon iconName="ProjectCollection" />
                    </div>
                    <span className={styles.menuItemText}>Projects &gt;</span>
                </div>
                <div className={styles.menuItem}>
                    <div className={styles.menuItemIcon}>
                        {/* Placeholder for 'Your chats' icon if specific one needed, or just text alignment */}
                    </div>
                    <span className={styles.menuItemText}>Your chats &gt;</span>
                </div>
            </div>

            <div className={styles.footer}>
                <div className={styles.userProfile}>
                    <div className={styles.avatar}>OS</div>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>Oliver Scharkowski</span>
                        <span className={styles.userStatus}>Pro</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
