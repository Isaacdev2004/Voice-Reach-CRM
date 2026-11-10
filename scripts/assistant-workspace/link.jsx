import React from "react";
export default function Link({ href, children, prefetch, ...props }) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (
          !event.defaultPrevented &&
          !event.metaKey &&
          !event.ctrlKey &&
          href.startsWith("/")
        ) {
          event.preventDefault();
          history.pushState({}, "", href);
          window.dispatchEvent(new Event("review:navigation"));
        }
      }}
    >
      {children}
    </a>
  );
}
