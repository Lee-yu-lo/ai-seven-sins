#!/bin/bash
FFMPEG="/Users/jiangzhuang/WorkBuddy/2026-08-20-14-35-44/ai-seven-sins/tools/ffmpeg"
VDIR="/Users/jiangzhuang/WorkBuddy/2026-08-20-17-21-51/videos"
IDIR="/Users/jiangzhuang/WorkBuddy/2026-08-20-17-21-51/images"
ODIR="/Users/jiangzhuang/WorkBuddy/2026-08-20-17-21-51/website/assets/videos"
IMDIR="/Users/jiangzhuang/WorkBuddy/2026-08-20-17-21-51/website/assets/images"

# Transcode 7 video segments
$FFMPEG -y -i "$VDIR/Content_streams_flow_from_floa_2026-08-20T16-14-48.mp4" -c:v libx264 -preset fast -crf 26 -vf "scale=1280:720" -an -movflags +faststart "$ODIR/sin_gluttony.mp4" 2>&1 | tail -1
echo "gluttony: $(ls -lh "$ODIR/sin_gluttony.mp4" | awk '{print $5}')"

$FFMPEG -y -i "$VDIR/Hands_reach_and_grasp_at_flowi_2026-08-20T16-17-30.mp4" -c:v libx264 -preset fast -crf 26 -vf "scale=1280:720" -an -movflags +faststart "$ODIR/sin_greed.mp4" 2>&1 | tail -1
echo "greed: $(ls -lh "$ODIR/sin_greed.mp4" | awk '{print $5}')"

$FFMPEG -y -i "$VDIR/Brain_neurons_shut_off_one_by__2026-08-20T16-19-27.mp4" -c:v libx264 -preset fast -crf 26 -vf "scale=1280:720" -an -movflags +faststart "$ODIR/sin_sloth.mp4" 2>&1 | tail -1
echo "sloth: $(ls -lh "$ODIR/sin_sloth.mp4" | awk '{print $5}')"

$FFMPEG -y -i "$VDIR/The_holographic_woman_glitches_2026-08-20T16-21-42.mp4" -c:v libx264 -preset fast -crf 26 -vf "scale=1280:720" -an -movflags +faststart "$ODIR/sin_lust.mp4" 2>&1 | tail -1
echo "lust: $(ls -lh "$ODIR/sin_lust.mp4" | awk '{print $5}')"

$FFMPEG -y -i "$VDIR/Wind_blows_the_tattered_cape_d_2026-08-20T16-23-26.mp4" -c:v libx264 -preset fast -crf 26 -vf "scale=1280:720" -an -movflags +faststart "$ODIR/sin_pride.mp4" 2>&1 | tail -1
echo "pride: $(ls -lh "$ODIR/sin_pride.mp4" | awk '{print $5}')"

$FFMPEG -y -i "$VDIR/Hand_cracks_further_like_porce_2026-08-20T16-25-16.mp4" -c:v libx264 -preset fast -crf 26 -vf "scale=1280:720" -an -movflags +faststart "$ODIR/sin_envy.mp4" 2>&1 | tail -1
echo "envy: $(ls -lh "$ODIR/sin_envy.mp4" | awk '{print $5}')"

$FFMPEG -y -i "$VDIR/Fire_and_data_fragments_fly_be_2026-08-20T16-27-17.mp4" -c:v libx264 -preset fast -crf 26 -vf "scale=1280:720" -an -movflags +faststart "$ODIR/sin_wrath.mp4" 2>&1 | tail -1
echo "wrath: $(ls -lh "$ODIR/sin_wrath.mp4" | awk '{print $5}')"

# Copy VJ final
cp /Users/jiangzhuang/WorkBuddy/2026-08-20-17-21-51/seven_sins_VJ_final.mp4 "$ODIR/vj_final.mp4"
echo "vj_final: $(ls -lh "$ODIR/vj_final.mp4" | awk '{print $5}')"

# Optimize images
$FFMPEG -y -i "$IDIR/A_naked_figure_curled_in_fetal_2026-08-20T16-08-46.png" -vf "scale=1280:720" -q:v 3 "$IMDIR/sin_gluttony.jpg" 2>&1 | tail -1
echo "img gluttony: $(ls -lh "$IMDIR/sin_gluttony.jpg" | awk '{print $5}')"

$FFMPEG -y -i "$IDIR/A_massive_server_farm_reimagin_2026-08-20T16-09-16.png" -vf "scale=1280:720" -q:v 3 "$IMDIR/sin_greed.jpg" 2>&1 | tail -1
echo "img greed: $(ls -lh "$IMDIR/sin_greed.jpg" | awk '{print $5}')"

$FFMPEG -y -i "$IDIR/A_person_reclining_in_a_transp_2026-08-20T16-09-42.png" -vf "scale=1280:720" -q:v 3 "$IMDIR/sin_sloth.jpg" 2>&1 | tail -1
echo "img sloth: $(ls -lh "$IMDIR/sin_sloth.jpg" | awk '{print $5}')"

$FFMPEG -y -i "$IDIR/A_man_tightly_embracing_a_tran_2026-08-20T16-10-08.png" -vf "scale=1280:720" -q:v 3 "$IMDIR/sin_lust.jpg" 2>&1 | tail -1
echo "img lust: $(ls -lh "$IMDIR/sin_lust.jpg" | awk '{print $5}')"

$FFMPEG -y -i "$IDIR/A_lone_human_standing_at_a_cli_2026-08-20T16-10-34.png" -vf "scale=1280:720" -q:v 3 "$IMDIR/sin_pride.jpg" 2>&1 | tail -1
echo "img pride: $(ls -lh "$IMDIR/sin_pride.jpg" | awk '{print $5}')"

$FFMPEG -y -i "$IDIR/A_person_before_a_massive_smar_2026-08-20T16-11-00.png" -vf "scale=1280:720" -q:v 3 "$IMDIR/sin_envy.jpg" 2>&1 | tail -1
echo "img envy: $(ls -lh "$IMDIR/sin_envy.jpg" | awk '{print $5}')"

$FFMPEG -y -i "$IDIR/A_futuristic_city_split_by_a_g_2026-08-20T16-11-36.png" -vf "scale=1280:720" -q:v 3 "$IMDIR/sin_wrath.jpg" 2>&1 | tail -1
echo "img wrath: $(ls -lh "$IMDIR/sin_wrath.jpg" | awk '{print $5}')"

echo "=== All assets prepared ==="
