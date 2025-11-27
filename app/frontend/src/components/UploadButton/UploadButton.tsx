import { CloudArrowUp24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

import styles from "./UploadButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
    disabled?: boolean;
}

/**
 * UploadButton component for triggering the document upload panel.
 * Follows the same pattern as SettingsButton and ClearChatButton.
 */
export const UploadButton = ({ className, disabled, onClick }: Props) => {
    const { t } = useTranslation();
    return (
        <button
            type="button"
            className={`${styles.container} ${className ?? ""}`}
            disabled={disabled}
            onClick={onClick}
        >
            <CloudArrowUp24Regular className={styles.icon} />
            <span className={styles.label}>{t("upload.uploadButton", "Upload")}</span>
        </button>
    );
};

