# Team-PICK-O


## Git 협업 플로우 (비배포 기준 로컬 개발 중심)
<br />
- 반복 흐름 요약
<br />
main  ← (아직 배포 안함, 기준 브랜치 역할만)<br />
<br />
dev   ← 통합 브랜치 (여러 기능이 병합되어 있음) <br />
 │ <br />
 ├── feature/login <br />
 ├── feature/signup <br />
 ├── feature/emotion-analysis <br />
 └── ... <br />
<br />
<br />
## 브랜치 플로우 순서 <br />
- 기능 개발 전 준비 <br />
git checkout dev <br />
git pull origin dev      # 최신 dev 기반<br />
git checkout -b feature/기능명 <br />
<br />
- 기능 개발 및 커밋 (개발 후) <br />
git add . <br />
git commit -m "feat: 로그인 기능 구현" <br />
git push origin feature/기능명 <br />
<br />
- 통합 브랜치(dev)에 병합 <br />
git checkout dev <br />
git pull origin dev      # dev 최신화 <br />
git merge feature/기능명 <br />
git push origin dev <br />
<br />
- 다음 기능 시작할 때 다시 dev 기준으로 <br />
git checkout dev <br />
git pull origin dev <br />
git checkout -b feature/다음기능
