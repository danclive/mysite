import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "main.run",
  description: "My Site",

  lastUpdated: true,
  cleanUrls: false,
  metaChunk: true,

  markdown: {
    math: true,
    lineNumbers: true,
    container: {
      tipLabel: '提示',
      warningLabel: '警告',
      dangerLabel: '危险',
      infoLabel: '信息',
      detailsLabel: '详细信息'
    }
  },

  sitemap: {
    hostname: 'https://main.run',
    transformItems(items) {
      return items.filter((item) => !item.url.includes('migration'))
    }
  },


  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
    ],

    sidebar: {
      '/rust/': { base: '/rust/', items: sideberRust() }
    },

    footer: {
      message: '基于 <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">署名-非商业性使用-禁止演绎 4.0 国际</a> 许可发布',
      copyright: `版权所有 © 2023-${new Date().getFullYear()} danc`
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    outline: {
      label: '页面导航'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/danclive' }
    ],

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '搜索'
          },
          modal: {
            displayDetails: '显示细节',
            resetButtonTitle: '清除',
            noResultsText: '无法找到相关结果',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            }
          }
        }
      }
    }
  }
})

function sideberRust() {
  return [
    {
      text: 'Rust 系列',
      items: [
        { text: '目录', link: '/' },
        { text: '数组与指针', link: 'array-and-pointer' },
        { text: '使用 trait 进行类型转换', link: 'use-trait-for-type-conversion' },
      ]
    }
  ]
}
