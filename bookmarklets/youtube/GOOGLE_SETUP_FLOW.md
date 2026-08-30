# Google 계정 최초 설정 구조

이 문서는 `YouTube 수집도구 설정` 화면의 Google 계정 연결과 Drive/Sheets 자동 생성 구조를 고정합니다.

## 결론

`Google 계정으로 계속` → 전용 Drive 폴더 → Google Sheets 파일 → 기본 시트 → 기본 카테고리까지 **자동 생성**하려면 Google OAuth가 필요합니다.

현재 북마클릿이 실행되는 YouTube 페이지 자체에서 OAuth를 직접 처리하는 방식은 최종 구조로 사용하지 않습니다.

Google Identity Services의 브라우저 OAuth는 등록된 **Authorized JavaScript origin**에서 실행되어야 하므로, 인증 전용 HTTPS origin이 필요합니다.

따라서 단계 8은 다음 두 부분으로 나눕니다.

1. 자동 생성 로직/권한/메시지 구조 확정
2. 실제 OAuth를 실행할 HTTPS origin 확정 후 인증 페이지 연결

2번 origin이 정해지기 전에는 실제 Google 계정 연결을 완료 처리하지 않습니다.

---

## 필요한 Google 권한

기본 권한은 다음 하나만 사용합니다.

```text
https://www.googleapis.com/auth/drive.file
```

이 범위로 이 도구가 직접 생성하거나 사용자가 이 도구에 연 파일만 접근하는 구조를 기본으로 합니다.

전체 Drive 접근 권한인 `drive`는 기본값으로 사용하지 않습니다.

---

## 필요한 Google 설정

자동 설정을 사용하려면 Google Cloud에서 Web OAuth Client가 하나 필요합니다.

필수값:

- Web OAuth Client ID
- Authorized JavaScript origin
- Drive API 활성화
- Sheets API 활성화

OAuth **Client ID는 비밀번호나 토큰이 아니며 공개 식별자**입니다.

다음 값은 코드/문서/저장소에 저장하지 않습니다.

- Client Secret
- access token
- refresh token
- 세션 값
- 인증 쿠키

브라우저 token model에서 받은 access token은 인증 페이지의 실행 메모리에서만 사용하고 localStorage/IndexedDB에 저장하지 않습니다.

---

## 인증 전용 페이지 역할

인증 전용 페이지는 정적 HTTPS 페이지로 충분하며 백엔드는 필요하지 않습니다.

역할:

1. Google Identity Services 로드
2. 사용자가 `Google 계정으로 계속`을 눌렀을 때 계정 선택/동의 요청
3. `drive.file` access token을 실행 메모리에 보관
4. Drive API / Sheets API REST 호출
5. 생성 결과의 ID와 이름만 통합 UI/북마클릿에 반환
6. access token은 다른 창이나 YouTube 페이지로 전달하지 않음

---

## 최초 자동 생성 순서

### 1. 계정 연결

사용자 클릭으로 Google 계정 선택과 권한 동의를 시작합니다.

### 2. 전용 폴더 생성

Drive API `files.create`로 다음 폴더를 생성합니다.

```text
YouTube 수집
```

MIME type:

```text
application/vnd.google-apps.folder
```

### 3. Google Sheets 파일 생성

Drive API `files.create`로 전용 폴더 안에 Google Sheets 파일을 생성합니다.

기본 파일명:

```text
YouTube Research
```

MIME type:

```text
application/vnd.google-apps.spreadsheet
```

생성 시 `parents`에 위 전용 폴더 ID를 지정합니다.

### 4. 기본 시트 설정

Sheets API `spreadsheets.batchUpdate`로 첫 시트 이름을 기본값으로 정합니다.

기본 시트명:

```text
AI 자료
```

### 5. 기본 헤더 기록

Sheets API `spreadsheets.values.batchUpdate` 또는 `spreadsheets.values.update`로 기본 열 구조를 기록합니다.

초기 열 구조는 단계 9의 실제 Drive/Sheets 저장 구현에서 최종 확정합니다.

### 6. 기본 카테고리 생성

기본 카테고리:

```text
생성형 AI
```

카테고리는 별도 Google 리소스가 아니라 수집도구가 관리하는 논리값입니다.

실제 저장 방식은 단계 9에서 시트 내부 관리 영역 또는 전용 설정 영역으로 확정합니다.

---

## 설정 완료 후 보관 가능한 값

다음 값은 인증정보가 아니므로 설정 상태로 보관할 수 있습니다.

```js
{
  configured: true,
  folderId: '',
  spreadsheetId: '',
  spreadsheetName: 'YouTube Research',
  sheetId: 0,
  sheetName: 'AI 자료',
  category: '생성형 AI'
}
```

저장 금지:

```text
access token
refresh token
Google 로그인 세션
인증 쿠키
Client Secret
```

---

## 통합 UI와의 흐름

```text
YouTube 수집도구 설정
        ↓
[Google 계정으로 계속]
        ↓
인증 전용 HTTPS 페이지
        ↓
Google 계정 선택 / 동의
        ↓
[설정 시작]
        ↓
YouTube 수집 폴더 생성
        ↓
YouTube Research 시트 파일 생성
        ↓
AI 자료 기본 시트 설정
        ↓
생성형 AI 기본 카테고리 설정
        ↓
설정 결과 ID/이름만 반환
        ↓
[설정 완료]
```

---

## 현재 제약

현재 프로젝트는 GitHub Pages와 별도 서버를 사용하지 않는 구조로 정리되어 있습니다.

하지만 Google 브라우저 OAuth는 등록된 HTTPS JavaScript origin이 필요합니다.

따라서 **현재 제약을 그대로 유지하면 자동 계정 연결/폴더·Sheets 생성은 실제 실행할 수 없습니다.**

다음 중 하나가 필요합니다.

### A. 인증 전용 정적 HTTPS origin 사용

- 백엔드 없음
- 무료 정적 호스팅 가능
- OAuth Client ID와 origin을 연결
- 자동 설정 가능

### B. HTTPS origin을 끝까지 사용하지 않음

- Google 계정 자동 연결 불가
- 폴더/Sheets 자동 생성 불가
- 사용자가 Drive/Sheets를 수동으로 만든 뒤 ID/링크를 지정하는 방식으로 UI를 변경해야 함

현재 UI 기준본은 자동 생성을 전제로 하므로 A 방식이 기능 요구사항과 일치합니다.

---

## 단계 8 완료 조건

다음이 모두 만족되어야 실제 완료입니다.

- OAuth Web Client ID 준비
- 인증용 HTTPS origin 확정
- `drive.file` 동의 성공
- `YouTube 수집` 폴더 자동 생성
- `YouTube Research` Google Sheets 파일 자동 생성
- `AI 자료` 기본 시트 설정
- `생성형 AI` 기본 카테고리 초기화
- access token 비영구 저장
- 설정 결과 ID/이름만 통합 도구에 저장

현재는 **자동 생성 구조 확정 / 인증 origin 결정 대기** 상태입니다.
