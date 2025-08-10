---
title: "Test COG"
type: "maps"
slug: "test_COG"
draft: false
---

<!-- UI specifica per questa mappa: slider layer-swipe -->
<div id="cog-swipe-wrapper">
  <label for="cog-swipe">Confronto 2015 ⇄ 2022</label>
  <input id="cog-swipe" type="range" min="0" max="100" value="50" />
</div>

<style>
  /* Posizionamento overlay dello slider (solo per questa pagina) */
  #cog-swipe-wrapper{
    position:absolute;
    z-index:5;
    top:0.5em;
    left:50%;
    transform:translateX(-50%);
    background: rgba(5,102,141,1);
    color: rgba(2,195,154,1);
    padding: 6px 10px;
    box-shadow: 5px 5px 8px 4px rgba(0,0,0,0.2);
    border-radius: 0;
    display:flex;
    align-items:center;
    gap:.5em;
    font-size:14px;
  }
  #cog-swipe{
    width: 36vw;
  }
</style>

Mappa di test per lavorare con raster COG (layer-swipe 2015 vs 2022).
