import argparse
import csv
import io
import json
import shutil
import sys
import zipfile
from pathlib import Path
from statistics import median

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

Image.MAX_IMAGE_PIXELS = None

项目根 = Path(__file__).resolve().parent.parent
规则路径 = 项目根 / "佐证材料" / "脱敏规则.json"


def 载入规则():
    with open(规则路径, encoding="utf-8") as 句柄:
        规则 = json.load(句柄)
    for 键 in ("源目录", "输出目录", "压缩包路径", "公共参数", "文件"):
        if 键 not in 规则:
            raise ValueError(f"脱敏规则缺少字段 {键}")
    已知 = {"矩形遮挡", "标签条", "裁切带", "照片块", "CSV删列", "原样入包"}
    for 项 in 规则["文件"]:
        for 动作 in 项["动作"]:
            if 动作["类型"] not in 已知:
                raise ValueError(f"未知动作类型 {动作['类型']}")
    return 规则


def 环带中位色(图, 矩形, 环宽):
    宽, 高 = 图.size
    x0, y0, x1, y1 = 矩形
    环 = []
    上 = (max(0, x0 - 环宽), max(0, y0 - 环宽), min(宽, x1 + 环宽), y0)
    下 = (max(0, x0 - 环宽), y1, min(宽, x1 + 环宽), min(高, y1 + 环宽))
    左 = (max(0, x0 - 环宽), y0, x0, y1)
    右 = (x1, y0, min(宽, x1 + 环宽), y1)
    for 块 in (上, 下, 左, 右):
        if 块[2] <= 块[0] or 块[3] <= 块[1]:
            continue
        区 = 图.crop(块)
        数据 = 区.tobytes()
        总数 = 区.width * 区.height
        取样 = max(1, 总数 // 20000)
        环.extend(
            (数据[i * 3], 数据[i * 3 + 1], 数据[i * 3 + 2]) for i in range(0, 总数, 取样)
        )
    if not 环:
        return (0, 0, 0)
    return tuple(int(median(p[i] for p in 环)) for i in range(3))


def 填充矩形(图, 矩形, 环宽):
    from PIL import ImageDraw

    色 = 环带中位色(图, 矩形, 环宽)
    画 = ImageDraw.Draw(图)
    画.rectangle(矩形, fill=色)
    return 色


def 均值(区):
    return 区.resize((1, 1), Image.BOX).getpixel((0, 0))


def 灰底占比(灰图, 窗口, 灰范围, 亮阈):
    宽, 高 = 灰图.size
    x0, y0, x1, y1 = 窗口
    窗口 = (max(0, x0), max(0, y0), min(宽, x1), min(高, y1))
    if 窗口[2] <= 窗口[0] or 窗口[3] <= 窗口[1]:
        return 1.0
    区 = 灰图.crop(窗口)
    非亮 = 区.point(lambda p: 255 if p < 亮阈 else 0)
    灰 = 区.point(lambda p: 255 if 灰范围[0] <= p <= 灰范围[1] else 0)
    底 = 均值(非亮)
    if 底 <= 0:
        return 1.0
    return 均值(灰) / 底


def 执行矩形遮挡(图, 动作, 参数):
    执行矩形遮挡.记录.append(tuple(动作["矩形"]))
    return 填充矩形(图, 动作["矩形"], 参数["填充"]["取样环宽"])


def 执行标签条(图, 动作, 参数):
    配置 = dict(参数["标签条"])
    配置.update({k: v for k, v in 动作.items() if k in ("文字列",)})
    列0, 列1 = 动作["文字列"]
    宽, 高 = 图.size
    列1 = min(列1, 宽)
    灰图 = 图.convert("L")
    亮阈 = 配置["亮度阈值"]
    亮 = 灰图.point(lambda p: 255 if p >= 亮阈 else 0).crop((列0, 0, 列1, 高))
    行密度 = 亮.resize((1, 高), Image.BOX).tobytes()
    命中行 = [y for y in range(高) if 行密度[y] > 0]
    带列表 = []
    间隙 = 配置["行间隙"]
    for y in 命中行:
        if 带列表 and y - 带列表[-1][1] <= 间隙:
            带列表[-1][1] = y
        else:
            带列表.append([y, y])
    外扩 = 配置["外扩"]
    矩形列表 = []
    for y0, y1 in 带列表:
        行高 = y1 - y0 + 1
        if 行高 > 配置["最大行高"]:
            continue
        列密度 = 亮.crop((0, y0, 列1 - 列0, y1 + 1)).resize((列1 - 列0, 1), Image.BOX).tobytes()
        有字列 = [i for i, v in enumerate(列密度) if v > 0]
        if not 有字列:
            continue
        x0 = 列0 + 有字列[0] - 外扩
        x1 = 列0 + 有字列[-1] + 1 + 外扩
        if x1 - x0 < 配置["最小行宽"]:
            continue
        探窗 = (x0 - 外扩 * 3, y0 - 外扩 - 6, x1 + 外扩 * 3, y1 + 外扩 + 7)
        if 灰底占比(灰图, 探窗, 配置["灰底亮度范围"], 配置["灰底亮度范围"][1] + 1) >= 配置["灰底占比阈值"]:
            continue
        矩形列表.append((max(0, x0), max(0, y0 - 外扩), min(宽, x1), min(高, y1 + 1 + 外扩)))
    合并 = 合并矩形(矩形列表, 外扩)
    for 矩形 in 合并:
        填充矩形(图, 矩形, 参数["填充"]["取样环宽"])
    执行标签条.记录.extend(合并)
    return 合并


def 合并矩形(矩形列表, 间距):
    列表 = [list(r) for r in 矩形列表]
    改动 = True
    while 改动 and len(列表) > 1:
        改动 = False
        结果 = []
        while 列表:
            a = 列表.pop()
            并入 = None
            for i, b in enumerate(结果):
                if not (a[2] + 间距 < b[0] or b[2] + 间距 < a[0] or a[3] + 间距 < b[1] or b[3] + 间距 < a[1]):
                    并入 = i
                    break
            if 并入 is None:
                结果.append(a)
            else:
                b = 结果[并入]
                结果[并入] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                改动 = True
        列表 = 结果
    return [tuple(r) for r in 列表]


def 裁切带(图, 动作, 参数):
    宽, 高 = 图.size
    左 = int(动作["左宽"])
    右 = int(动作["右起"])
    if not 0 < 左 < 右 < 宽:
        raise ValueError(f"裁切带越界 {动作} 于 {宽}x{高}")
    配置 = 参数["裁切带自检"]
    灰图 = 图.convert("L")
    for 名, 窗口 in (("左切线", (左, 0, 左 + 6, 高)), ("右切线", (右 - 6, 0, 右, 高))):
        比 = 灰底占比(灰图, 窗口, 参数["标签条"]["灰底亮度范围"], 参数["标签条"]["灰底亮度范围"][1] + 1)
        if 比 > 配置["边界列灰底占比上限"]:
            print(f"  警告 {名} 处灰底占比 {比:.2f} 超上限，可能切进气泡")
    return 图.crop((左, 0, 右, 高))


def 扩张块(图, 矩形, 配置):
    from PIL import ImageChops

    格 = 配置["网格"]
    底阈 = 配置["背景亮度阈"]
    亮阈 = 配置["中性亮阈"]
    彩阈 = 配置["彩度阈"]
    限 = max(1, 配置["最大扩张"] // 格)
    宽, 高 = 图.size
    格宽, 格高 = max(1, 宽 // 格), max(1, 高 // 格)
    r, g, b = 图.split()
    最大 = ImageChops.lighter(ImageChops.lighter(r, g), b)
    最小 = ImageChops.darker(ImageChops.darker(r, g), b)
    彩 = ImageChops.subtract(最大, 最小)
    亮列 = 最大.resize((格宽, 格高), Image.BOX).tobytes()
    彩列 = 彩.resize((格宽, 格高), Image.BOX).tobytes()
    实心 = [
        亮列[i] > 底阈 and (亮列[i] > 亮阈 or 彩列[i] > 彩阈) for i in range(格宽 * 格高)
    ]
    x0, y0, x1, y1 = 矩形
    cx0, cy0 = x0 // 格, y0 // 格
    cx1, cy1 = min(格宽 - 1, (x1 - 1) // 格), min(格高 - 1, (y1 - 1) // 格)
    已见 = set()
    队列 = []
    for cy in range(cy0, cy1 + 1):
        for cx in range(cx0, cx1 + 1):
            i = cy * 格宽 + cx
            if 实心[i]:
                已见.add(i)
                队列.append((cx, cy))
    最小x, 最小y, 最大x, 最大y = cx0, cy0, cx1, cy1
    while 队列:
        cx, cy = 队列.pop()
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if nx < 0 or ny < 0 or nx >= 格宽 or ny >= 格高:
                continue
            i = ny * 格宽 + nx
            if i in 已见 or not 实心[i]:
                continue
            if max(cx0 - nx, nx - cx1, 0) > 限 or max(cy0 - ny, ny - cy1, 0) > 限:
                continue
            已见.add(i)
            队列.append((nx, ny))
            最小x, 最小y = min(最小x, nx), min(最小y, ny)
            最大x, 最大y = max(最大x, nx), max(最大y, ny)
    return (最小x * 格, 最小y * 格, (最大x + 1) * 格, (最大y + 1) * 格)


def 检测照片块(图, 配置):
    宽, 高 = 图.size
    灰图 = 图.convert("L")
    亮 = 灰图.point(lambda p: 255 if p > 配置["亮度阈值"] else 0)
    密 = 亮.filter(ImageFilter.BoxBlur(配置["密度核半径"]))
    实 = 密.point(lambda p: 255 if p >= 配置["密度阈值"] * 255 else 0)
    格 = 配置["网格"]
    格宽, 格高 = max(1, 宽 // 格), max(1, 高 // 格)
    小 = 实.resize((格宽, 格高), Image.BOX)
    小像素 = 小.tobytes()
    实心 = [i for i, v in enumerate(小像素) if v >= 128]
    所属 = {}
    块列表 = []
    for i in 实心:
        if i in 所属:
            continue
        栈 = [i]
        所属[i] = len(块列表)
        成员 = []
        while 栈:
            c = 栈.pop()
            成员.append(c)
            cx, cy = c % 格宽, c // 格宽
            for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                if 0 <= nx < 格宽 and 0 <= ny < 格高:
                    n = ny * 格宽 + nx
                    if n in 所属 or 小像素[n] < 128:
                        continue
                    所属[n] = 所属[i]
                    栈.append(n)
        xs = [c % 格宽 for c in 成员]
        ys = [c // 格宽 for c in 成员]
        块列表.append((min(xs) * 格, min(ys) * 格, (max(xs) + 1) * 格, (max(ys) + 1) * 格))
    外扩 = 配置["外扩"]
    候选 = []
    for x0, y0, x1, y1 in 块列表:
        核 = (max(0, x0), max(0, y0), min(宽, x1), min(高, y1))
        带 = (
            max(0, 核[0] - 外扩),
            max(0, 核[1] - 外扩),
            min(宽, 核[2] + 外扩),
            min(高, 核[3] + 外扩),
        )
        if (带[2] - 带[0]) * (带[3] - 带[1]) < 配置["最小面积"]:
            continue
        扩 = 扩张块(图, 核, 配置["扩张"])
        矩形 = (
            max(0, 扩[0] - 外扩),
            max(0, 扩[1] - 外扩),
            min(宽, 扩[2] + 外扩),
            min(高, 扩[3] + 外扩),
        )
        候选.append(矩形)
    return 候选


def 执行照片块(图, 动作, 参数):
    配置 = 参数["照片块"]
    合并 = 合并矩形(检测照片块(图, 配置), 配置["合并间距"])
    for 矩形 in 合并:
        填充矩形(图, 矩形, 参数["填充"]["取样环宽"])
    执行照片块.记录.extend(合并)
    return 合并


def 处理图片(源, 目标, 项, 参数, 采集=None, 保存=True):
    图 = Image.open(源).convert("RGB")
    if 采集 is not None:
        采集["原图"] = 图.copy()
        采集["裁切左"] = 0
    执行矩形遮挡.记录 = []
    执行标签条.记录 = []
    执行照片块.记录 = []
    for 动作 in 项["动作"]:
        类型 = 动作["类型"]
        if 类型 == "矩形遮挡":
            执行矩形遮挡(图, 动作, 参数)
        elif 类型 == "标签条":
            执行标签条(图, 动作, 参数)
        elif 类型 == "裁切带":
            if 采集 is not None:
                采集["裁切左"] = int(动作["左宽"])
            图 = 裁切带(图, 动作, 参数)
        elif 类型 == "照片块":
            执行照片块(图, 动作, 参数)
        elif 类型 == "原样入包":
            break
    if 采集 is not None:
        采集["输出"] = 图
        采集["填充"] = [
            *执行矩形遮挡.记录,
            *执行标签条.记录,
        ]
        采集["照片块填充"] = list(执行照片块.记录)
    if not 保存:
        return {"名称": 项["名称"], "输出尺寸": 图.size}
    目标.parent.mkdir(parents=True, exist_ok=True)
    if 目标.suffix.lower() in (".jpg", ".jpeg"):
        图.save(目标, quality=参数["图片输出质量"], subsampling=1)
    else:
        图.save(目标)
    return {
        "名称": 项["名称"],
        "输出尺寸": 图.size,
        "矩形遮挡": 执行矩形遮挡.记录,
        "标签条": 执行标签条.记录,
        "照片块": 执行照片块.记录,
    }


def 处理CSV(源, 目标, 动作):
    原文 = 源.read_text(encoding="utf-8-sig", newline="")
    行列表 = list(csv.reader(io.StringIO(原文)))
    if not 行列表:
        raise ValueError("CSV 为空")
    表头 = 行列表[0]
    列名 = 动作["列名"]
    if 列名 not in 表头:
        raise ValueError(f"CSV 表头缺少列 {列名}，实际 {表头}")
    索引 = 表头.index(列名)
    新表头 = [c for i, c in enumerate(表头) if i != 索引]
    输出 = io.StringIO()
    写 = csv.writer(输出, lineterminator="\r\n")
    写.writerow(新表头)
    for 行 in 行列表[1:]:
        写.writerow([c for i, c in enumerate(行) if i != 索引])
    目标.parent.mkdir(parents=True, exist_ok=True)
    目标.write_bytes(b"\xef\xbb\xbf" + 输出.getvalue().encode("utf-8"))
    return {"名称": 项名(源), "删列": 列名, "行数": len(行列表) - 1, "列数": len(新表头)}


def 项名(源):
    return 源.name


def 打包(清单, 压缩包):
    压缩包.parent.mkdir(parents=True, exist_ok=True)
    if 压缩包.exists():
        压缩包.unlink()
    with zipfile.ZipFile(压缩包, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as 包:
        for 名称, 路径 in 清单:
            包.write(路径, arcname=名称)
    报告 = []
    with zipfile.ZipFile(压缩包) as 包:
        for 信息 in 包.infolist():
            非ASCII = not all(ord(c) < 128 for c in 信息.filename)
            报告.append((信息.filename, 信息.file_size, bool(信息.flag_bits & 0x800), 非ASCII))
    for 名称, _, 置位, 非ASCII in 报告:
        if 非ASCII and not 置位:
            raise ValueError(f"zip 内 {名称} 未设置 UTF-8 标志位")
    return 报告


def 严格命中判定(输出图, 框, 填充矩形列表, 豁免列表):
    x0, y0, x1, y1 = 框
    区 = 输出图.convert("L").crop(框)
    if 区.width < 8 or 区.height < 8:
        return "covered"
    边 = 区.filter(ImageFilter.FIND_EDGES).point(lambda p: 255 if p > 40 else 0)
    掩 = Image.new("L", 区.size, 0)
    画 = ImageDraw.Draw(掩)
    for r in 填充矩形列表:
        相 = (r[0] - x0, r[1] - y0, r[2] - x0, r[3] - y0)
        if 相[2] > 0 and 相[0] < 区.width and 相[3] > 0 and 相[1] < 区.height:
            画.rectangle(相, fill=255)
    掩 = 掩.filter(ImageFilter.MaxFilter(9))
    残 = ImageChops.multiply(边, ImageChops.invert(掩))
    残数 = int(ImageStat.Stat(残).sum[0] / 255)
    总 = 区.width * 区.height
    if 残数 <= 总 * 0.004:
        return "covered"
    豁 = Image.new("L", 区.size, 0)
    画 = ImageDraw.Draw(豁)
    for r in 豁免列表:
        相 = (r[0] - x0, r[1] - y0, r[2] - x0, r[3] - y0)
        if 相[2] > 0 and 相[0] < 区.width and 相[3] > 0 and 相[1] < 区.height:
            画.rectangle(相, fill=255)
    盖 = int(ImageStat.Stat(ImageChops.multiply(残, 豁)).sum[0] / 255)
    return "exempted" if 盖 / 残数 >= 0.95 else "diff"


def 遮挡边界自检(原图, 项):
    警告 = []
    灰 = 原图.convert("L")
    for 动作 in 项["动作"]:
        if 动作["类型"] != "矩形遮挡":
            continue
        x0, y0, x1, y1 = 动作["矩形"]
        区 = 灰.crop((x0, y0, x1, y1))
        px = 区.load()
        触边 = []
        for x in range(区.width):
            if px[x, 0] > 170 or px[x, 区.height - 1] > 170:
                触边.append("上下")
                break
        if not 触边:
            for y in range(区.height):
                if px[0, y] > 170 or px[区.width - 1, y] > 170:
                    触边.append("左右")
                    break
        if 触边:
            警告.append(f"{项['名称']} 矩形{动作['矩形']} 内亮像素触及{触边[0]}边缘，遮挡可能不完整")
    return 警告


def 审计(规则, 参数, 切片目录):
    严格 = dict(参数["照片块"])
    严格.update(参数["严格审计"])
    assert 严格["亮度阈值"] <= 参数["照片块"]["亮度阈值"], "严格审计亮度阈值必须不高于生产值"
    assert 严格["最小面积"] <= 参数["照片块"]["最小面积"], "严格审计最小面积必须不高于生产值"
    if 切片目录.exists():
        shutil.rmtree(切片目录)
    切片目录.mkdir(parents=True, exist_ok=True)
    源目录 = 项目根 / 规则["源目录"]
    全部差异 = []
    全部警告 = []
    总命中 = 0
    for 项 in 规则["文件"]:
        名称 = 项["名称"]
        if 名称.lower().endswith(".csv"):
            continue
        if any(动作["类型"] == "原样入包" for 动作 in 项["动作"]):
            原图 = Image.open(源目录 / 名称).convert("RGB")
            输出 = 原图
            裁切左 = 0
            填充列表 = []
        else:
            采集 = {}
            处理图片(源目录 / 名称, None, 项, 参数, 采集=采集, 保存=False)
            原图, 输出, 裁切左 = 采集["原图"], 采集["输出"], 采集["裁切左"]
            填充列表 = [
                (r[0] - 裁切左, r[1], r[2] - 裁切左, r[3]) for r in 采集["填充"]
            ] + list(采集["照片块填充"])
        全部警告.extend(遮挡边界自检(原图, 项))
        宽, 高 = 输出.size
        豁免列表 = [
            条目["输出框"]
            for 条目 in 规则.get("审计豁免", [])
            if 条目["文件"] == 名称
        ]
        序号 = 0
        for 框 in 合并矩形(检测照片块(原图, 严格), 严格["合并间距"]):
            总命中 += 1
            映射 = (max(0, 框[0] - 裁切左), 框[1], min(宽, 框[2] - 裁切左), min(高, 框[3]))
            if 映射[2] <= 映射[0]:
                continue
            状态 = 严格命中判定(输出, 映射, 填充列表, 豁免列表)
            if 状态 != "diff":
                continue
            序号 += 1
            内缩框 = (
                max(0, 映射[0] - 8),
                max(0, 映射[1] - 8),
                min(宽, 映射[2] + 8),
                min(高, 映射[3] + 8),
            )
            stem = Path(名称).stem.replace(" ", "_")
            切片 = 切片目录 / f"{stem}__{序号:02d}_{内缩框[0]}-{内缩框[1]}-{内缩框[2]}-{内缩框[3]}.png"
            输出.crop(内缩框).save(切片)
            全部差异.append(
                {"文件": 名称, "原图框": list(框), "输出框": list(映射), "切片": str(切片)}
            )
    print(json.dumps(
        {"严格检测命中": 总命中, "差异数": len(全部差异), "差异": 全部差异, "边界警告": 全部警告},
        ensure_ascii=False, indent=2,
    ))
    return 0 if not 全部差异 else 1


def 主流程():
    规则 = 载入规则()
    参数 = dict(规则["公共参数"])
    参数["图片输出质量"] = 规则["图片输出质量"]
    源目录 = 项目根 / 规则["源目录"]
    输出目录 = 项目根 / 规则["输出目录"]
    压缩包 = 项目根 / 规则["压缩包路径"]
    输出目录.mkdir(parents=True, exist_ok=True)
    清单 = []
    报告 = []
    for 项 in 规则["文件"]:
        名称 = 项["名称"]
        源 = 源目录 / 名称
        if not 源.exists():
            raise FileNotFoundError(f"缺少素材 {源}")
        目标 = 输出目录 / 名称
        需要脱敏 = any(动作["类型"] not in ("原样入包", "CSV删列") for 动作 in 项["动作"])
        if 名称.lower().endswith(".csv"):
            摘要 = 处理CSV(源, 目标, next(a for a in 项["动作"] if a["类型"] == "CSV删列"))
        elif 需要脱敏:
            摘要 = 处理图片(源, 目标, 项, 参数)
        else:
            import shutil

            目标.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(源, 目标)
            摘要 = {"名称": 名称, "原样入包": True}
        清单.append((名称, 目标))
        报告.append(摘要)
        print(f"处理 {名称}: {json.dumps(摘要, ensure_ascii=False, default=str)}")
    zip报告 = 打包(清单, 压缩包)
    print(f"打包 {压缩包.relative_to(项目根)} 共 {len(zip报告)} 条目")
    for 名称, 大小, _, _ in zip报告:
        print(f"  {名称} {大小}")
    if len(zip报告) != len(规则["文件"]):
        raise ValueError("zip 条目数与规则文件数不一致")
    return 0


def 自检():
    规则 = 载入规则()
    配置 = 规则["公共参数"]["照片块"]
    底 = Image.new("RGB", (400, 400), (10, 10, 10))
    纹理 = Image.new("RGB", (200, 200))
    像 = 纹理.load()
    for y in range(200):
        for x in range(200):
            像[x, y] = (30, 20, 15) if (x // 8 + y // 8) % 8 == 0 else (200, 180, 160)
    底.paste(纹理, (100, 100))
    命中 = 检测照片块(底, 配置)
    assert 命中, "检测照片块 未命中合成亮块"
    框 = min(命中, key=lambda r: (r[2] - r[0]) * (r[3] - r[1]))
    均匀 = Image.new("RGB", (400, 400), (10, 10, 10))
    均匀.paste(Image.new("RGB", (200, 200), (15, 15, 15)), (100, 100))
    assert 严格命中判定(均匀, 框, [框], []) == "covered"
    assert 严格命中判定(底, 框, [], []) == "diff"
    assert 严格命中判定(底, 框, [], [框]) == "exempted"
    assert 严格命中判定(底, 框, [], [(框[0], 框[1], 框[0] + 10, 框[3])]) == "diff"
    assert 严格命中判定(底, 框, [(框[0], 框[1], 框[0] + 10, 框[3])], []) == "diff"
    环 = 环带中位色(均匀, (100, 100, 300, 300), 9)
    assert 环 == (10, 10, 10), f"环带中位色异常 {环}"
    裁 = 裁切带(底, {"左宽": 130, "右起": 335}, 规则["公共参数"])
    assert 裁.size == (205, 400)
    assert 合并矩形([(0, 0, 10, 10), (12, 0, 20, 10)], 4) == [(0, 0, 20, 10)]
    print("自检通过：检测照片块/严格命中判定/环带中位色/裁切带/合并矩形")
    return 0


if __name__ == "__main__":
    解析 = argparse.ArgumentParser(description="佐证材料脱敏打包；--audit 用更严阈值复核残留")
    解析.add_argument("--audit", action="store_true", help="严格检测差异集，输出切片到 佐证材料/审计切片/")
    解析.add_argument("--selftest", action="store_true", help="审计判定逻辑单元自检（毫秒级，无副作用）")
    选项 = 解析.parse_args()
    if 选项.selftest:
        sys.exit(自检())
    规则 = 载入规则()
    if 选项.audit:
        参数 = dict(规则["公共参数"])
        参数["图片输出质量"] = 规则["图片输出质量"]
        sys.exit(审计(规则, 参数, 项目根 / 规则["源目录"] / "审计切片"))
    sys.exit(主流程())
