import './style.css';
if(new URLSearchParams(location.search).get('view')==='card') void import('./card-page');
else if(new URLSearchParams(location.search).get('view')==='box') void import('./music-box');
else if(new URLSearchParams(location.search).get('view')==='archaeology') void import('./archaeology-page');
else void import('./main');
window.addEventListener('hashchange',()=>location.reload());
