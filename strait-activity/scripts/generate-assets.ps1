Add-Type -AssemblyName System.Drawing
$assetRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../assets'))
[System.IO.Directory]::CreateDirectory($assetRoot) | Out-Null
function C($hex) { return [System.Drawing.ColorTranslator]::FromHtml($hex) }
function B($hex) { return [System.Drawing.SolidBrush]::new((C $hex)) }
# 配色與 DESIGN_GUIDELINES.md 一致
$paper='#fbf8f1'; $ink='#16213e'; $blue='#2f5bea'; $coral='#e8364f'; $teal='#0b8a91'
$yellow='#ffc94d'; $sky='#8fb8ff'; $pink='#ff5a6e'; $cyan='#3cc4cc'; $stage2='#2b3a67'
$scale=@('#f1eee4','#ffe08a','#ffb347','#ff7a45','#e0336b','#6b1f8f')

function New-RoundRect($x,$y,$w,$h,$r) {
    $p=[System.Drawing.Drawing2D.GraphicsPath]::new(); $d=$r*2
    $p.AddArc($x,$y,$d,$d,180,90); $p.AddArc($x+$w-$d,$y,$d,$d,270,90)
    $p.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90); $p.AddArc($x,$y+$h-$d,$d,$d,90,90); $p.CloseFigure(); return $p
}
# 品牌標記：深藍底，左長條黃、右上珊瑚、右下青
function Draw-Mark($g,$x,$y,$s) {
    $g.FillRectangle((B $yellow),[single]($x+$s*.20),[single]($y+$s*.19),[single]($s*.21),[single]($s*.62))
    $g.FillRectangle((B $pink),[single]($x+$s*.53),[single]($y+$s*.19),[single]($s*.27),[single]($s*.19))
    $g.FillRectangle((B $cyan),[single]($x+$s*.53),[single]($y+$s*.50),[single]($s*.27),[single]($s*.31))
}
foreach ($size in @(32,180)) {
    $bitmap=[System.Drawing.Bitmap]::new($size,$size)
    $g=[System.Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    if ($size -eq 32) { $g.Clear([System.Drawing.Color]::Transparent); $g.FillPath((B $ink),(New-RoundRect 0 0 31 31 7)) } else { $g.Clear((C $ink)) }
    Draw-Mark $g 0 0 $size
    $name = if ($size -eq 32) { 'favicon-32.png' } else { 'apple-touch-icon.png' }
    $bitmap.Save((Join-Path $assetRoot $name),[System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bitmap.Dispose()
}

$bitmap=[System.Drawing.Bitmap]::new(1200,630)
$g=[System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear((C $paper))
$font='Microsoft JhengHei'
$titleFont=[System.Drawing.Font]::new($font,78,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$bodyFont=[System.Drawing.Font]::new($font,30,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$smallFont=[System.Drawing.Font]::new($font,22,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
$badgeFont=[System.Drawing.Font]::new($font,24,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
# 左側：標記、標題、三色指標
$g.FillPath((B $ink),(New-RoundRect 64 64 64 64 14)); Draw-Mark $g 64 64 64
$g.DrawString('台海觀測所',$titleFont,(B $ink),52,170)
$g.DrawString('看懂每天的共機數字',$bodyFont,(B $ink),62,280)
$x=64
foreach ($pair in @(@('共機',$blue),@('越過中線',$coral),@('具名軍演',$teal))) {
    $w=[int]$g.MeasureString($pair[0],$badgeFont).Width+30
    $g.FillPath((B $pair[1]),(New-RoundRect $x 352 $w 46 23))
    $g.DrawString($pair[0],$badgeFont,(B '#ffffff'),[single]($x+14),[single]360)
    $x+=$w+12
}
# 年曆色階示意（僅圖例，不代表實際資料）
for ($i=0;$i -lt 6;$i++) { $g.FillPath((B $scale[$i]),(New-RoundRect ([single](64+$i*52)) 456 44 44 7)) }
$g.DrawString('少',$smallFont,(B '#5b6478'),64,508); $g.DrawString('多',$smallFont,(B '#5b6478'),334,508)
$g.DrawString('資料來源：國防部公開資料',$smallFont,(B '#5b6478'),64,560)
# 右側：深藍舞台與符號
$g.FillRectangle((B $ink),660,0,540,630)
$points=@(@(0,-44),@(7,-36),@(7,-13),@(50,10),@(50,19),@(7,8),@(7,35),@(22,44),@(22,50),@(0,43),@(-22,50),@(-22,44),@(-7,35),@(-7,8),@(-50,19),@(-50,10),@(-7,-13),@(-7,-36))
foreach ($p in @(@(800,150,1.0),@(930,120,1.5),@(1070,165,1.0))) {
    $poly=[System.Drawing.PointF[]]@($points | ForEach-Object { [System.Drawing.PointF]::new([single]($p[0]+$_[0]*$p[2]),[single]($p[1]+$_[1]*$p[2])) })
    $g.FillPolygon((B $sky),$poly)
}
$g.FillEllipse((B $stage2),800,270,170,170)
$clip=$g.Save(); $path=[System.Drawing.Drawing2D.GraphicsPath]::new(); $path.AddEllipse(800,270,170,170); $g.SetClip($path)
$g.FillRectangle((B $pink),800,325,170,115); $g.Restore($clip); $path.Dispose()
$shipPen=[System.Drawing.Pen]::new((C $yellow),6); $shipPen.LineJoin=[System.Drawing.Drawing2D.LineJoin]::Round
$hull=[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(1000,392),[System.Drawing.PointF]::new(1052,410),[System.Drawing.PointF]::new(1104,392),[System.Drawing.PointF]::new(1094,433),[System.Drawing.PointF]::new(1010,433))
$g.DrawPolygon($shipPen,$hull); $g.DrawLines($shipPen,[System.Drawing.PointF[]]@([System.Drawing.PointF]::new(1014,391),[System.Drawing.PointF]::new(1014,357),[System.Drawing.PointF]::new(1090,357),[System.Drawing.PointF]::new(1090,391))); $g.DrawRectangle($shipPen,1040,335,24,22)
$g.DrawString('yuuyuutube.github.io/tools',$smallFont,(B '#b8c2de'),800,548)
$bitmap.Save((Join-Path $assetRoot 'og.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$shipPen.Dispose(); $titleFont.Dispose(); $bodyFont.Dispose(); $smallFont.Dispose(); $badgeFont.Dispose(); $g.Dispose(); $bitmap.Dispose()
Write-Output 'Generated favicon PNGs and 1200x630 OG image.'
