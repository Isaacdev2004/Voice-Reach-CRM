/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import React from 'react';
export default function Image({fill,priority,unoptimized,sizes,style,...props}) {return <img {...props} style={fill ? {position:'absolute',inset:0,width:'100%',height:'100%',...style}:style}/>}
