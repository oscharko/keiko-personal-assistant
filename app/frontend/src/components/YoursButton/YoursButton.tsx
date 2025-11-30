import {Accessibility24Regular, ChevronDown24Regular, ChevronRight24Regular} from "@fluentui/react-icons";
import {useTranslation} from "react-i18next";

import styles from "./YoursButton.module.css";

interface Props {
    className?: string;
    disabled?: boolean;
    isOpen?: boolean;
    label?: string;
    onClick: () => void;
}

export const YoursButton = ({className, disabled, isOpen = false, label, onClick}: Props) => {
    const {t} = useTranslation();
    return (
        <button type="button" className={`${styles.container} ${className ?? ""}`} disabled={disabled}
                onClick={onClick}>
            <Accessibility24Regular className={styles.icon}/>
            <span className={styles.label}>{label}</span>
            <span className={styles.chevron}>{isOpen ? <ChevronDown24Regular/> : <ChevronRight24Regular/>}</span>
        </button>
    );
};
