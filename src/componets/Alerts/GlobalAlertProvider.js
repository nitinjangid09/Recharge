/**
 * GlobalAlertProvider.js
 * Renders the CustomAlert at the root level so it can be triggered from anywhere.
 */

import React, { useState, useEffect } from "react";
import CustomAlert, { AlertService } from "./CustomAlert";

const GlobalAlertProvider = ({ children }) => {
  const [config, setConfig] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    onClose: null,
  });

  useEffect(() => {
    AlertService.setAlertReference({
      show: (newConfig) => {
        setConfig({
          ...newConfig,
          visible: true,
        });
      },
      hide: () => {
        setConfig((prev) => ({ ...prev, visible: false }));
      },
    });
  }, []);

  const handleClose = () => {
    if (config.onClose) {
      config.onClose();
    }
    setConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <>
      {children}
      <CustomAlert
        visible={config.visible}
        type={config.type}
        title={config.title}
        message={config.message}
        onClose={handleClose}
        onConfirm={config.onConfirm}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
      />
    </>
  );
};

export default GlobalAlertProvider;
