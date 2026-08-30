# Instagram RI 미디어 저장 규칙

## 저장 위치
- 기본 다운로드
- 지정 폴더
- 지정 폴더 핸들은 IndexedDB에 저장하고 재실행 시 복원 시도
- 사용자가 `기본 다운로드`를 선택하면 지정 폴더를 기억하더라도 현재 저장 방식은 기본 다운로드로 전환

## Reel 파일명
- 영상+소리: `IG_{shortcode}_reel.mp4` (브라우저가 MP4 결합 미지원이면 `.webm`)
- 원본 영상: `IG_{shortcode}_video.mp4`
- 원본 음원: `IG_{shortcode}_audio.m4a`
- 첫 프레임: `IG_{shortcode}_frame001.jpg`

## 이미지 원칙
- Reel 이미지 저장은 임의의 대표 장면을 고르지 않는다.
- 영상의 `0초` 첫 표시 프레임을 저장한다.
- 파일명은 `frame001`로 고정한다.

## 향후 사진/슬라이드 규칙
- 사진: `IG_{shortcode}_photo_01.{ext}`
- 슬라이드: `IG_{shortcode}_slide_01.{ext}`, `slide_02` ...
- 한 게시물의 모든 파일은 동일한 `{shortcode}`를 사용한다.
