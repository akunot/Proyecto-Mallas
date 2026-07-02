<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('backup:database')->dailyAt('03:00');

Schedule::command('model:prune')->daily();
