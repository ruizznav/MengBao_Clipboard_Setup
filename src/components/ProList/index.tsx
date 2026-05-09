import { List, type ListProps } from "antd";
import type { FC } from "react";
import styles from "./index.module.scss";

const ProList: FC<ListProps<unknown>> = (props) => {
  const { header, children, ...rest } = props;

  return (
    <div className="cute-settings-section">
      {header && (
        <div className="cute-settings-header" data-tauri-drag-region>
          {header}
        </div>
      )}

      <List bordered {...rest}>
        {children}
      </List>
    </div>
  );
};

export default ProList;
