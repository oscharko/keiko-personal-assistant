/**
 * News button component for sidebar navigation.
 * Navigates to the personalized news dashboard.
 */

import { News24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import styles from "./NewsButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
    disabled?: boolean;
}

export const NewsButton = ({ className, disabled, onClick }: Props) => {
    const { t } = useTranslation();
    return (
        <button
            type="button"
            className={`${styles.container} ${className ?? ""}`}
            disabled={disabled}
            onClick={onClick}
        >
            <News24Regular className={styles.icon} />
            <span className={styles.label}>{t("news.navButton")}</span>
        </button>
    );
};

