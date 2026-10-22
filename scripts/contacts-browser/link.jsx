import React from 'react';
export default function Link({href,children,prefetch,...props}) {return <a href={typeof href === 'string' ? href : href.pathname} {...props}>{children}</a>}
