<?php

namespace App\Http\Controllers;

use App\Concerns\SanitizesJson;

abstract class Controller
{
    use SanitizesJson;
}
