<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Acceso</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #1a4a2e;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 5px 5px;
        }
        .code-box {
            background-color: #fff;
            border: 2px dashed #1a4a2e;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            border-radius: 5px;
        }
        .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #1a4a2e;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
        }
        .warning {
            color: #d9534f;
            font-size: 14px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Sistema de Mallas Académicas</h1>
        <p>Universidad Nacional de Colombia - Sede Manizales</p>
    </div>
    
    <div class="content">
        <p>Hola <strong>{{ $userName }}</strong>,</p>
        
        <p>Has solicitado un código de acceso para el Sistema de Mallas Académicas.</p>
        
        <div class="code-box">
            <p>Tu código de verificación es:</p>
            <p class="code">{{ $otpCode }}</p>
        </div>
        
        <p class="warning">
            ⚠️ Este código tiene una validez de <strong>10 minutos</strong>. 
            No compartas este código con nadie.
        </p>
        
        <p>Si no solicitaste este código, puedes ignorar este correo.</p>
    </div>
    
    <div class="footer">
        <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        <p>&copy; {{ date('Y') }} Universidad Nacional de Colombia - Sede Manizales</p>
    </div>
</body>
</html>
