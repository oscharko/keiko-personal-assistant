/**
 * Ideas button component for sidebar navigation.
 * Navigates to the Ideas Hub page.
 */

import { Lightbulb24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import styles from "./IdeasButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
    disabled?: boolean;
}

export const IdeasButton = ({ className, disabled, onClick }: Props) => {
    const { t } = useTranslation();
    return (
        <button
            type="button"
            className={`${styles.container} ${className ?? ""}`}
            disabled={disabled}
            onClick={onClick}
        >
            <Lightbulb24Regular className={styles.icon} />
            <span className={styles.label}>{t("ideas.navButton")}</span>
        </button>
    );
};

