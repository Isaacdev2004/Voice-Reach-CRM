const fs=require('node:fs'),postcss=require('postcss');
postcss([require('@tailwindcss/postcss')({base:process.cwd()})])
 .process(fs.readFileSync('app/globals.css','utf8'),{from:'app/globals.css'})
 .then(result=>fs.writeFileSync('/tmp/isv-registration.css',result.css))
 .catch(error=>{console.error(error.message);process.exitCode=1;});
