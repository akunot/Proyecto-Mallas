<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otpCode;
    public string $userName;

    /**
     * Create a new message instance.
     */
    public function __construct(string $otpCode, string $userName)
    {
        $this->otpCode = $otpCode;
        $this->userName = $userName;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Código de Acceso - Sistema de Mallas Académicas UNAL',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.otp-code',
            with: [
                'otpCode' => $this->otpCode,
                'userName' => $this->userName,
            ],
        );
    }
}
