import './style.css';
if(new URLSearchParams(location.search).get('view')==='card') void import('./card-page');
else void import('./main');
window.addEventListener('hashchange',()=>location.reload());
