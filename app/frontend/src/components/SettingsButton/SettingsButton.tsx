import {Settings24Regular} from "@fluentui/react-icons";
import {useTranslation} from "react-i18next";

import styles from "./SettingsButton.module.css";

interface Props {
    className?: string;
    onClick: () => void;
    disabled?: boolean;
}

export const SettingsButton = ({className, disabled, onClick}: Props) => {
    const {t} = useTranslation();
    return (
        <button type="button" className={`${styles.container} ${className ?? ""}`} disabled={disabled}
                onClick={onClick}>
            <Settings24Regular className={styles.icon}/>
            <span className={styles.label}>{t("playground.navButton")}</span>
        </button>
    );
};
