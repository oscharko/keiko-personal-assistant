import {ClipboardTextEdit24Regular} from "@fluentui/react-icons";
import {useTranslation} from "react-i18next";

import styles from "./ClearChatButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
    disabled?: boolean;
}

export const ClearChatButton = ({className, disabled, onClick}: Props) => {
    const {t} = useTranslation();
    return (
        <button type="button" className={`${styles.container} ${className ?? ""}`} disabled={disabled}
                onClick={onClick}>
            <ClipboardTextEdit24Regular className={styles.icon}/>
            <span className={styles.label}>{t("clearChat")}</span>
        </button>
    );
};
