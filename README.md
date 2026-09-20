# Contador de Graos V2

Web app Chrome sem Python. Processamento local com OpenCV.js.

## Publicar no GitHub Pages
1. Envie todo o conteudo desta pasta para a raiz do repositorio.
2. Confirme que `.github/workflows/deploy.yml` existe.
3. Em Settings > Pages, selecione Source: GitHub Actions.
4. Faça commit na branch main e acompanhe Actions.
5. Abra a URL HTTPS publicada no Chrome e permita a camera.

## Calibracao
1. Superficie vazia -> CALIBRAR FUNDO.
2. Coloque 20-50 graos separados -> APRENDER PERFIL DOS GRAOS.
3. Coloque a amostra completa.

A V2 aprende area mediana, media, desvio e diametro equivalente. Em aglomerados, testa varios limiares do Distance Transform e combina centros encontrados com uma estimativa pela area tipica para reduzir subcontagem.
