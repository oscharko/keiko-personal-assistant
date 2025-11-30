import {ChevronDown24Regular, ChevronRight24Regular, History24Regular} from "@fluentui/react-icons";
import {useTranslation} from "react-i18next";

import styles from "./HistoryButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    isOpen?: boolean;
    label?: string;
    onClick: () => void;
}

export const HistoryButton = ({className, disabled, isOpen = false, label, onClick}: Props) => {
    const {t} = useTranslation();
    return (
        <button type="button" className={`${styles.container} ${className ?? ""}`} disabled={disabled}
                onClick={onClick}>
            <History24Regular className={styles.icon}/>
            <span className={styles.label}>{label ?? t("history.chatHistory")}</span>
            <span className={styles.chevron}>{isOpen ? <ChevronDown24Regular/> : <ChevronRight24Regular/>}</span>
        </button>
    );
};
